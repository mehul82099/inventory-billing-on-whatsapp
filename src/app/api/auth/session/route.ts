import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// Returns the signed-in user's profile and shop. Client calls this after
// Supabase sign-in and on app load when a session exists.
export async function GET(request: Request) {
  const { context, response } = await getRequestContext(request);
  if (response) return response;
  if (!context!.backend) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 400 });
  }
  try {
    const shop = await context!.db.getShop();
    return NextResponse.json({ success: true, user: context!.user!.profile, shop });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
