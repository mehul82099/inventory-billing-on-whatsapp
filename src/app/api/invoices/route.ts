import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const invoices = dbService.getInvoices({ search, user_id: userId, limit });
    return NextResponse.json({ invoices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required to generate a bill' }, { status: 400 });
    }

    if (!body.user_id) {
      return NextResponse.json({ error: 'Authenticated user ID is required' }, { status: 401 });
    }

    // Atomic invoice creation & stock deduction
    const invoice = dbService.createInvoice({
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

    const shop = dbService.getShop();

    return NextResponse.json({
      success: true,
      invoice,
      shop,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating invoice' }, { status: 400 });
  }
}
