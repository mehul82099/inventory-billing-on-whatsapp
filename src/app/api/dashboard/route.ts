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

    const metrics = await dbService.getDashboardMetrics(date);
    const shop = await dbService.getShop();

    return NextResponse.json({
      metrics,
      shop,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
