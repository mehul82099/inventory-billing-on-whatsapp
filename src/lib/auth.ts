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
