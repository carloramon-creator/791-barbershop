import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET() {
  try {
    const userInfo = await getCurrentUserAndTenant();
    return NextResponse.json({
      ok: true,
      userInfo
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err)
    }, { status: 500 });
  }
}
