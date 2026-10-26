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

      const movement = await dbService.adjustStockTx(
        body.product_id,
        Number(body.new_quantity),
        body.reason || '',
        user.id,
        user.full_name
      );

      return NextResponse.json({ success: true, movement });
    } else if (action === 'return') {
      if (!body.idempotency_key || typeof body.idempotency_key !== 'string') {
        return NextResponse.json({ error: 'Missing idempotency key - retry-safe returns require one' }, { status: 400 });
      }
      const returnRec = await dbService.createReturnTx(String(body.idempotency_key), {
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
    const msg = err.message || 'Server error';
      const status = /IDEMPOTENCY_CONFLICT/.test(msg) ? 409 : /not found/i.test(msg) ? 404 : 400;
      return NextResponse.json({ error: msg.replace('createReturnTx: ','').replace('adjustStockTx: ','') }, { status });
  }
}
