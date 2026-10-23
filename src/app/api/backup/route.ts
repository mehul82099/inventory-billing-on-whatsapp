import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const backup = dbService.exportBackup();
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mobile_shop_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const backupData = await request.json();
    dbService.restoreBackup(backupData);
    return NextResponse.json({ success: true, message: 'Database restored successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
