import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ error: 'User authorization required' }, { status: 401 });
    }

    const user = dbService.getUserById(body.user_id);
    if (!user || (!user.can_cancel_bills && user.role !== 'owner')) {
      return NextResponse.json({ error: 'You do not have permission to cancel bills' }, { status: 403 });
    }

    const cancelled = dbService.cancelInvoice(
      id,
      body.user_id,
      user.full_name,
      body.reason || 'Customer requested bill cancellation'
    );

    return NextResponse.json({ success: true, invoice: cancelled });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
