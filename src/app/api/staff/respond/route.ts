import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SupabaseDb } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

// Invitee-side consent. The caller authenticates with their own account
// (which may not have a shop profile yet); they can only see and answer
// invitations addressed to their own verified email.
async function authedEmail(request: Request): Promise<{ uid: string; email: string } | NextResponse> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id || !data.user.email) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
  }
  return { uid: data.user.id, email: data.user.email.toLowerCase() };
}

export async function GET(request: Request) {
  const auth = await authedEmail(request);
  if (auth instanceof NextResponse) return auth;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('staff_invitations')
    .select('id,shop_id,full_name,can_receive_stock,can_apply_custom_discount,can_cancel_bills,can_view_purchase_cost,expires_at')
    .eq('email', auth.email)
    .eq('status', 'pending');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const open = (data || []).filter((i: any) => new Date(i.expires_at).getTime() > Date.now());
  if (open.length === 0) return NextResponse.json({ invitations: [] });
  const shopIds = Array.from(new Set(open.map((i: any) => i.shop_id)));
  const { data: shops } = await admin.from('shops').select('id,name').in('id', shopIds);
  const nameOf = new Map((shops || []).map((s: any) => [s.id, s.name]));
  return NextResponse.json({
    invitations: open.map((i: any) => ({ ...i, shop_name: nameOf.get(i.shop_id) || 'a shop' })),
  });
}

export async function POST(request: Request) {
  const auth = await authedEmail(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const invitationId = String(body.invitation_id || '');
    const action = String(body.action || '');
    if (!invitationId || (action !== 'accept' && action !== 'decline')) {
      return NextResponse.json({ error: 'invitation_id and action (accept|decline) are required' }, { status: 400 });
    }
    const admin = getSupabaseAdmin();
    const { data: inv, error: invErr } = await admin
      .from('staff_invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle();
    if (invErr || !inv) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    if (inv.email !== auth.email) return NextResponse.json({ error: 'This invitation is addressed to a different account' }, { status: 403 });
    if (inv.status !== 'pending') return NextResponse.json({ error: 'This invitation has already been answered' }, { status: 409 });
    if (new Date(inv.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });

    if (action === 'decline') {
      await admin.from('staff_invitations').update({ status: 'revoked' }).eq('id', invitationId).eq('status', 'pending');
      return NextResponse.json({ success: true, declined: true });
    }

    // Accept: consent is proven by the authenticated email match above.
    // Never re-parent an account that already belongs to a shop.
    const { data: existing } = await admin.from('users').select('id,shop_id').eq('id', auth.uid).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Your account already belongs to a shop' }, { status: 409 });
    }
    const db = new SupabaseDb(admin, inv.shop_id);
    const member = await db.createStaffProfile({
      id: auth.uid,
      email: auth.email,
      full_name: inv.full_name,
      can_receive_stock: inv.can_receive_stock,
      can_apply_custom_discount: inv.can_apply_custom_discount,
      can_cancel_bills: inv.can_cancel_bills,
      can_view_purchase_cost: inv.can_view_purchase_cost,
    });
    await admin
      .from('staff_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: auth.uid })
      .eq('id', invitationId)
      .eq('status', 'pending');
    return NextResponse.json({ success: true, member });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
