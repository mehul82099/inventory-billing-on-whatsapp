import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = dbService.getUserByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Passwords for the two accounts
    const valid =
      (cleanEmail === 'owner@shop.com' && password === 'Owner@123') ||
      (cleanEmail === 'cashier@shop.com' && password === 'Cashier@123') ||
      password === 'Shop@123'; // Universal shop backup password

    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Account has been deactivated by owner' }, { status: 403 });
    }

    const shop = dbService.getShop();

    return NextResponse.json({
      success: true,
      user,
      shop,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
