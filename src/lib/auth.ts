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
  // TEMP server-side probe: compare the identity the auth server returns.
  console.warn('requireShop identity', { uid: data?.user?.id || null, emailLocal: (data?.user?.email || '').split('@')[0], errCode: (error as any)?.code || (error as any)?.status || null });
  if (error || !data?.user?.id) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
  }
  // TEMP server-side probe: exact request URL + raw result of the profile lookup
  const all = await admin.from('users').select('id,email').limit(5);
  console.warn('requireShop users-visible', { rows: (all.data || []).map((r: any) => r.id + '|' + r.email), err: all.error?.code || null });
  const q = admin.from('users').select('*').eq('id', data.user.id).maybeSingle();
  console.warn('requireShop profile-query', { url: (q as any).url ? (q as any).url.toString() : 'n/a' });
  const { data: profile, error: profileError } = await q;
  console.warn('requireShop profile-result', { found: Boolean(profile), errCode: profileError?.code || null, errMsg: profileError?.message || null });
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
