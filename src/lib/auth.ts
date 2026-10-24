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
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
  }
  // TEMP server-side probe (sanitized: key format/length and visible-row count only)
  const sk = process.env.INV_SUPABASE_SERVICE_ROLE_KEY || '';
  const probe = await admin.from('users').select('id', { count: 'exact', head: true });
  console.warn('requireShop probe', {
    keyFmt: sk.startsWith('sb_secret_') ? 'sb_secret' : sk.startsWith('sb_publishable_') ? 'sb_publishable' : sk ? 'other' : 'empty',
    keyLen: sk.length,
    visibleUsers: probe.count,
    probeErr: probe.error?.code || null,
  });
  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError || !profile) {
    // Server-side diagnostic only (sanitized): distinguishes lookup error vs missing row.
    console.warn('requireShop profile lookup failed', { hadError: Boolean(profileError), code: profileError?.code || null, found: Boolean(profile) });
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
