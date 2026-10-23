import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const shop = dbService.getShop();
    const users = dbService.getUsers();
    return NextResponse.json({ shop, users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (body.shop) {
      const updatedShop = dbService.updateShop(body.shop);
      return NextResponse.json({ success: true, shop: updatedShop });
    }

    if (body.user_id && body.permissions) {
      const updatedUser = dbService.updateUserPermissions(body.user_id, body.permissions);
      return NextResponse.json({ success: true, user: updatedUser });
    }

    return NextResponse.json({ error: 'No update payload provided' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
