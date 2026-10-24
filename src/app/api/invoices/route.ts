import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { context, response } = await getRequestContext(request);
    if (response) return response;
    const dbService = context!.db;
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const idemKey = searchParams.get('idem_key') || undefined;
    if (idemKey) {
      const stored = await dbService.lookupIdempotencyKey(idemKey, 'create_invoice');
      return NextResponse.json({ found: !!stored?.response, invoice: stored?.response || null });
    }
    const invoices = await dbService.getInvoices({ search, user_id: userId, limit });
    return NextResponse.json({ invoices });
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

    const totalDiscount = Number(body.discount_amount || 0) + (Array.isArray(body.items) ? body.items.reduce((sum: number, i: any) => sum + Number(i.discount_amount || 0), 0) : 0);
    if (totalDiscount > 0 && context!.user && context!.user.role !== 'owner' && !(context!.user.profile as any)?.can_apply_custom_discount) {
      return NextResponse.json({ error: 'You do not have permission to apply custom discounts' }, { status: 403 });
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required to generate a bill' }, { status: 400 });
    }

    if (!body.user_id) {
      return NextResponse.json({ error: 'Authenticated user ID is required' }, { status: 401 });
    }

    if (!body.idempotency_key || typeof body.idempotency_key !== 'string') {
      return NextResponse.json({ error: 'Missing idempotency key - retry-safe billing requires one' }, { status: 400 });
    }

    // Whole bill in one DB transaction; retried keys return the original bill.
    const invoice = await dbService.createInvoiceTx(String(body.idempotency_key), {
      customer_name: body.customer_name || 'Walk-in Customer',
      customer_phone: body.customer_phone,
      user_id: body.user_id,
      user_name: body.user_name || 'Staff',
      items: body.items,
      discount_amount: body.discount_amount,
      tax_rate: body.tax_rate,
      payment_method: body.payment_method || 'CASH',
      paid_amount: body.paid_amount,
      is_tax_invoice: body.is_tax_invoice,
      notes: body.notes,
      allow_negative_override: body.allow_negative_override,
      override_reason: body.override_reason,
    });

    const shop = await dbService.getShop();

    return NextResponse.json({
      success: true,
      invoice,
      shop,
    });
  } catch (err: any) {
    const msg = err.message || 'Error creating invoice';
    const status = /IDEMPOTENCY_CONFLICT/.test(msg) ? 409 : /not found/i.test(msg) ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
