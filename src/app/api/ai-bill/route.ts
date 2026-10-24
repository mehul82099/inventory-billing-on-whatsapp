import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';
import { parseBillWithAi } from '@/lib/ai-parser';

export async function POST(request: Request) {
    const { context, response } = await getRequestContext(request);
    if (response) return response;
    const dbService = context!.db;
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt text is required' }, { status: 400 });
    }

    const products = await dbService.getProducts();
    const parsed = await parseBillWithAi(prompt, products);

    return NextResponse.json({
      success: true,
      parsedBill: parsed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error parsing AI bill' }, { status: 500 });
  }
}
