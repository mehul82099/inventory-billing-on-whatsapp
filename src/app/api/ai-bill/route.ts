import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { parseBillWithAi } from '@/lib/ai-parser';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt text is required' }, { status: 400 });
    }

    const products = dbService.getProducts();
    const parsed = await parseBillWithAi(prompt, products);

    return NextResponse.json({
      success: true,
      parsedBill: parsed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error parsing AI bill' }, { status: 500 });
  }
}
