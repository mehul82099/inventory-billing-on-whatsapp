import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Staff management: only the shop owner may list or add staff.
// New accounts are invited through the auth provider's managed invitation
// email (they set their own password); existing verified accounts are
// attached to the owner's shop directly - never shared passwords.
export async function GET(request: Request) {
  const { context, response } = await getRequestContext(request);
  if (response) return response;
  if (context!.user?.role !== 'owner') {
    return NextResponse.json({ error: 'Only the shop owner can manage staff' }, { status: 403 });
  }
  try {
    const staff = await context!.db.getUsers();
    return NextResponse.json({ staff });
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
    const perms = {
      can_receive_stock: !!body.can_receive_stock,
      can_apply_custom_discount: !!body.can_apply_custom_discount,
      can_cancel_bills: !!body.can_cancel_bills,
      can_view_purchase_cost: !!body.can_view_purchase_cost,
    };

    const admin = getSupabaseAdmin();
    let authUserId: string | null = null;
    let inviteSent = false;
    const origin = new URL(request.url).origin;
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: origin });
    if (!inviteError && inviteData?.user?.id) {
      authUserId = inviteData.user.id;
      inviteSent = true;
    } else {
      const msg = String(inviteError?.message || '').toLowerCase();
      if (!msg.includes('already') && !msg.includes('registered')) {
        return NextResponse.json({ error: 'Could not send invitation: ' + (inviteError?.message || 'unknown error') }, { status: 400 });
      }
      for (let page = 1; page <= 10 && !authUserId; page++) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 100 });
        const users = (list?.users || []) as any[];
        const found = users.find((u) => (u.email || '').toLowerCase() === email);
        if (found) authUserId = found.id;
        if (users.length < 100) break;
      }
      if (!authUserId) {
        return NextResponse.json({ error: 'This email already has an account but it could not be looked up' }, { status: 400 });
      }
    }

    const { data: existing } = await admin
      .from('users')
      .select('id,shop_id,role')
      .eq('id', authUserId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: existing.shop_id === context!.user.shopId ? 'This person is already on your team' : 'This account already belongs to another shop' },
        { status: 409 }
      );
    }

    const member = await context!.db.createStaffProfile({ id: authUserId, email, full_name: fullName, ...perms });
    return NextResponse.json({ success: true, member, invite_sent: inviteSent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
