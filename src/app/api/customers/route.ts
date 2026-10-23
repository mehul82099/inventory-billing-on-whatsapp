import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const customers = dbService.getCustomers();
    return NextResponse.json({ customers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
