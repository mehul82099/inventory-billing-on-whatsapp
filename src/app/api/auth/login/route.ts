import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { backendEnabled } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// File-demo login only. In backend mode the client signs in through Supabase
// Auth directly and this route is disabled. The demo credentials work only
// when DEMO_MODE=true is set on the server, so a deployed customer build
// cannot be entered through the demo accounts.
export async function POST(request: Request) {
  if (backendEnabled()) {
    return NextResponse.json({ error: 'Use account sign-in' }, { status: 410 });
  }
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo sign-in is disabled on this deployment' }, { status: 403 });
  }
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = dbService.getUserByEmail(cleanEmail);
    const valid =
      (cleanEmail === 'owner@shop.com' && password === 'Owner@123') ||
      (cleanEmail === 'cashier@shop.com' && password === 'Cashier@123');
    if (!user || !valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (!user.is_active) {
      return NextResponse.json({ error: 'Account has been deactivated by owner' }, { status: 403 });
    }
    const shop = dbService.getShop();
    return NextResponse.json({ success: true, user, shop });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
