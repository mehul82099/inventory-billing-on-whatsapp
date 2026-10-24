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
    if (context!.user && context!.user.role !== 'owner' && !(context!.user.profile as any)?.can_view_purchase_cost) {
      const m: any = metrics as any;
      m.totalGrossProfit = null;
      m.inventoryCostValuation = null;
      m.inventoryRetailValuation = null;
      if (Array.isArray(m.lowStockProducts)) m.lowStockProducts = m.lowStockProducts.map((p: any) => ({ ...p, purchase_cost: null }));
    }

    return NextResponse.json({
      metrics,
      shop,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
