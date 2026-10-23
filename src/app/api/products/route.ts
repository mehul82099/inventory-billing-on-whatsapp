import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const products = dbService.getProducts();
    const categories = dbService.getCategories();
    const suppliers = dbService.getSuppliers();
    return NextResponse.json({ products, categories, suppliers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || body.selling_price === undefined) {
      return NextResponse.json({ error: 'Product name and selling price are required' }, { status: 400 });
    }

    const saved = dbService.saveProduct(body);
    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Product ID is required for update' }, { status: 400 });
    }
    const updated = dbService.saveProduct(body);
    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    const ok = dbService.deleteProduct(id);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
