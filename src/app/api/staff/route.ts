import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Staff invitations (owner-only). An invitation never attaches anyone by
// itself: the invitee must authenticate and explicitly accept before a
// profile is created. New accounts additionally get the auth provider's
// managed invitation email so they set their own password. The response is
// deliberately uniform - it never reveals whether the email already has an
// account.
export async function GET(request: Request) {
  const { context, response } = await getRequestContext(request);
  if (response) return response;
  if (context!.user?.role !== 'owner') {
    return NextResponse.json({ error: 'Only the shop owner can manage staff' }, { status: 403 });
  }
  try {
    const staff = await context!.db.getUsers();
    const admin = getSupabaseAdmin();
    const { data: invitations } = await admin
      .from('staff_invitations')
      .select('id,email,full_name,status,expires_at,created_at')
      .eq('shop_id', context!.user.shopId)
      .order('created_at', { ascending: false });
    return NextResponse.json({ staff, invitations: invitations || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { context, response } = await getRequestContext(request);
  if (response) return response;
  if (!context!.backend || !context!.user) {
    return NextResponse.json({ error: 'Staff management requires the hosted backend' }, { status: 400 });
  }
  if (context!.user.role !== 'owner') {
    return NextResponse.json({ error: 'Only the shop owner can add staff' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.full_name || '').trim();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    }
    const admin = getSupabaseAdmin();

    // One open invitation per shop+email.
    const { data: dup } = await admin
      .from('staff_invitations')
      .select('id,status,expires_at')
      .eq('shop_id', context!.user.shopId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();
    if (dup && new Date(dup.expires_at).getTime() > Date.now()) {
      return NextResponse.json({ error: 'An invitation for this email is already pending' }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const invitation = {
      id: 'invst-' + crypto.randomUUID(),
      shop_id: context!.user.shopId,
      email,
      full_name: fullName,
      role: 'employee',
      can_receive_stock: !!body.can_receive_stock,
      can_apply_custom_discount: !!body.can_apply_custom_discount,
      can_cancel_bills: !!body.can_cancel_bills,
      can_view_purchase_cost: !!body.can_view_purchase_cost,
      status: 'pending',
      invited_by: context!.user.userId,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };
    const { error: insErr } = await admin.from('staff_invitations').insert(invitation);
    if (insErr) {
      return NextResponse.json({ error: 'Could not create invitation: ' + insErr.message }, { status: 400 });
    }

    // For brand-new accounts this sends the managed invitation email (they
    // set their own password). For existing accounts it is a no-op - the
    // invitee sees the pending invitation at their next sign-in. The result
    // is intentionally not disclosed to the caller.
    try {
      await admin.auth.admin.inviteUserByEmail(email, { redirectTo: new URL(request.url).origin });
    } catch { /* existing account or provider limit - invitation still stands */ }

    return NextResponse.json({ success: true, invitation: { email, expires_at: expiresAt } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
