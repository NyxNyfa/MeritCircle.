import { NextResponse } from 'next/server';
import { authenticateRequest, createSessionToken } from '@/lib/auth';

/**
 * Terbitkan session token (24 jam) setelah challenge wallet sukses.
 * Dipakai untuk polling (mis. notifikasi) tanpa popup tanda tangan berulang.
 */
export async function POST(req: Request) {
  try {
    const wallet = await authenticateRequest(req);
    if (!wallet) {
      return NextResponse.json({ error: 'Verifikasi wallet dibutuhkan' }, { status: 401 });
    }
    return NextResponse.json({ token: createSessionToken(wallet) }, { status: 200 });
  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
