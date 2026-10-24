import { NextResponse } from 'next/server';
import { backendEnabled, getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Completes registration AFTER the user has signed up through Supabase Auth
// (which owns email verification) and holds a valid session. Creates the
// shop + owner profile on first call; idempotent afterwards.
export async function POST(request: Request) {
  if (!backendEnabled()) {
    return NextResponse.json({ error: 'Registration requires the hosted backend' }, { status: 400 });
  }
  try {
    const header = request.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
    }
    const authUser = data.user;

    const body = await request.json();
    const shopName = (body.shopName || '').trim();
    const fullName = (body.fullName || '').trim();
    if (!shopName || !fullName) {
      return NextResponse.json({ error: 'Shop name and your name are required' }, { status: 400 });
    }

    // Existing profile? Registration already done.
    const { data: existing } = await admin.from('users').select('*').eq('id', authUser.id).maybeSingle();
    if (existing) {
      const { data: shop } = await admin.from('shops').select('*').eq('id', existing.shop_id).single();
      return NextResponse.json({ success: true, user: existing, shop, alreadyRegistered: true });
    }

    const shopId = `shop-${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const { error: shopErr } = await admin.from('shops').insert({
      id: shopId,
      name: shopName,
      email: authUser.email,
      phone: (body.phone || '').trim(),
      created_at: new Date().toISOString(),
    });
    if (shopErr) {
      return NextResponse.json({ error: `Could not create shop: ${shopErr.message}` }, { status: 500 });
    }

    const profile = {
      id: authUser.id,
      shop_id: shopId,
      email: (authUser.email || '').toLowerCase(),
      full_name: fullName,
      role: 'owner',
      is_active: true,
      can_receive_stock: true,
      can_apply_custom_discount: true,
      can_cancel_bills: true,
      can_view_purchase_cost: true,
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error: userErr } = await admin.from('users').insert(profile).select().single();
    if (userErr) {
      // Roll back the orphaned shop row.
      await admin.from('shops').delete().eq('id', shopId);
      return NextResponse.json({ error: `Could not create profile: ${userErr.message}` }, { status: 500 });
    }

    const { data: shop } = await admin.from('shops').select('*').eq('id', shopId).single();
    return NextResponse.json({ success: true, user: inserted, shop });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
