import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabase';

export interface AuthContext {
  userId: string;
  shopId: string;
  role: 'owner' | 'employee';
  fullName: string;
  email: string;
  profile: any;
}

export function isAuthContext(value: any): value is AuthContext {
  return Boolean(value && typeof value.shopId === 'string' && typeof value.userId === 'string');
}

// Verifies the caller's Supabase Auth JWT and loads their app profile.
// Returns an AuthContext or a NextResponse error to send back.
export async function requireShop(request: Request): Promise<AuthContext | NextResponse> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  // Reject expired tokens locally first: an auth provider that accepts them
  // leniently must never let one surface as "setup incomplete".
  try {
    const part = token.split('.')[1] || '';
    const payload = JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
  }
  // Explicit column list instead of select('*'): wildcard expansion returned
  // inconsistent results from the hosted API during its schema-cache incident;
  // named columns keep the profile lookup deterministic.
  const cols = 'id,shop_id,email,full_name,role,is_active,can_receive_stock,can_apply_custom_discount,can_cancel_bills,can_view_purchase_cost,created_at,updated_at';
  let { data: profile, error: profileError } = await admin
    .from('users')
    .select(cols)
    .eq('id', data.user.id)
    .maybeSingle();
  if (!profile && data.user.email) {
    // Resilience fallback: the hosted API has intermittently missed rows on
    // id-filtered lookups while email-filtered ones resolve. The email comes
    // from the same server-verified token, and users.email is unique.
    const alt = await admin
      .from('users')
      .select(cols)
      .eq('email', data.user.email.toLowerCase())
      .maybeSingle();
    if (alt.data && alt.data.id === data.user.id) {
      profile = alt.data;
      profileError = null;
    }
  }
  if (profileError || !profile) {
    return NextResponse.json({ error: 'Account setup incomplete. Please finish registration.' }, { status: 403 });
  }
  if (!profile.is_active) {
    return NextResponse.json({ error: 'Account has been deactivated by owner' }, { status: 403 });
  }
  return {
    userId: profile.id,
    shopId: profile.shop_id,
    role: profile.role,
    fullName: profile.full_name,
    email: profile.email,
    profile,
  };
}
