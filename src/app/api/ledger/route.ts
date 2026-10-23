import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const productId = searchParams.get('productId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const ledger = dbService.getDailyLedger(date);
    const movements = dbService.getStockMovements({
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
