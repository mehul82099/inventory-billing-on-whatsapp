import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { context, response } = await getRequestContext(request);
    if (response) return response;
    const dbService = context!.db;
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const productId = searchParams.get('productId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const ledger = await dbService.getDailyLedger(date);
    const movements = await dbService.getStockMovements({
      product_id: productId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      ledger,
      movements,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
