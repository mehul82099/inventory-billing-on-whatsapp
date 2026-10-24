import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { context, response } = await getRequestContext(request);
    if (response) return response;
    const dbService = context!.db;
  try {
    const shop = await dbService.getShop();
    const users = await dbService.getUsers();
    return NextResponse.json({ shop, users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    const { context, response } = await getRequestContext(request);
    if (response) return response;
    const dbService = context!.db;
    if (context!.backend && context!.user!.role !== 'owner') { return NextResponse.json({ error: 'Only the shop owner can change settings' }, { status: 403 }); }
  try {
    const body = await request.json();

    if (body.shop) {
      const updatedShop = await dbService.updateShop(body.shop);
      return NextResponse.json({ success: true, shop: updatedShop });
    }

    if (body.user_id && body.permissions) {
      const updatedUser = await dbService.updateUserPermissions(body.user_id, body.permissions);
      return NextResponse.json({ success: true, user: updatedUser });
    }

    return NextResponse.json({ error: 'No update payload provided' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
