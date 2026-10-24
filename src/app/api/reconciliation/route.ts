import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';

export async function POST(request: Request) {
    const { context, response } = await getRequestContext(request);
    if (response) return response;
    const dbService = context!.db;
  try {
    const body = await request.json();
    if (context!.user) { body.user_id = context!.user.userId; body.user_name = context!.user.fullName; }
    const action = body.action; // 'adjust' or 'return'

    if (!body.user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const user = await dbService.getUserById(body.user_id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    if (action === 'adjust') {
      if (user.role !== 'owner') {
        return NextResponse.json({ error: 'Only shop owner can authorize physical stock adjustments' }, { status: 403 });
      }

      const movement = await dbService.recordAdjustment({
        product_id: body.product_id,
        new_quantity: Number(body.new_quantity),
        reason: body.reason,
        user_id: user.id,
        user_name: user.full_name,
      });

      return NextResponse.json({ success: true, movement });
    } else if (action === 'return') {
      const returnRec = await dbService.recordCustomerReturn({
        invoice_id: body.invoice_id,
        product_id: body.product_id,
        quantity: Number(body.quantity),
        refund_amount: Number(body.refund_amount),
        condition: body.condition || 'SELLABLE',
        reason: body.reason || 'Customer Return',
        user_id: user.id,
        user_name: user.full_name,
      });

      return NextResponse.json({ success: true, returnRecord: returnRec });
    }

    return NextResponse.json({ error: 'Invalid reconciliation action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
