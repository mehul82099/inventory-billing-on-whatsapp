import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action; // 'adjust' or 'return'

    if (!body.user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const user = dbService.getUserById(body.user_id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    if (action === 'adjust') {
      if (user.role !== 'owner') {
        return NextResponse.json({ error: 'Only shop owner can authorize physical stock adjustments' }, { status: 403 });
      }

      const movement = dbService.recordAdjustment({
        product_id: body.product_id,
        new_quantity: Number(body.new_quantity),
        reason: body.reason,
        user_id: user.id,
        user_name: user.full_name,
      });

      return NextResponse.json({ success: true, movement });
    } else if (action === 'return') {
      const returnRec = dbService.recordCustomerReturn({
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
