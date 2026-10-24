import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { context, response } = await getRequestContext(request);
    if (response) return response;
    const dbService = context!.db;
  try {
    const purchases = await dbService.getPurchases();
    const suppliers = await dbService.getSuppliers();
    return NextResponse.json({ purchases, suppliers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
    const { context, response } = await getRequestContext(request);
    if (response) return response;
    const dbService = context!.db;
  try {
    const body = await request.json();
    if (context!.user) { body.user_id = context!.user.userId; body.user_name = context!.user.fullName; }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one received item is required' }, { status: 400 });
    }

    if (!body.user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const user = await dbService.getUserById(body.user_id);
    if (!user || (!user.can_receive_stock && user.role !== 'owner')) {
      return NextResponse.json({ error: 'You do not have permission to receive stock' }, { status: 403 });
    }

    const purchase = await dbService.recordPurchase({
      supplier_id: body.supplier_id,
      supplier_invoice_number: body.supplier_invoice_number,
      purchase_date: body.purchase_date,
      items: body.items,
      shipping_expenses: body.shipping_expenses,
      tax_amount: body.tax_amount,
      notes: body.notes,
      user_id: body.user_id,
      user_name: user.full_name,
    });

    return NextResponse.json({ success: true, purchase });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
