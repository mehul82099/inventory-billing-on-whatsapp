import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/backend';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
    const { context, response } = await getRequestContext(request);
    if (response) return response;
    const dbService = context!.db;
  try {
    const { id } = params;
    const body = await request.json();
    if (context!.user) { body.user_id = context!.user.userId; body.user_name = context!.user.fullName; }

    if (!body.user_id) {
      return NextResponse.json({ error: 'User authorization required' }, { status: 401 });
    }

    const user = await dbService.getUserById(body.user_id);
    if (!user || (!user.can_cancel_bills && user.role !== 'owner')) {
      return NextResponse.json({ error: 'You do not have permission to cancel bills' }, { status: 403 });
    }

    const cancelled = await dbService.cancelInvoiceTx(
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
