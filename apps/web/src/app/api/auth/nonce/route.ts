import { NextResponse } from 'next/server';
import { issueNonce } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const address = (body.address || body.walletAddress)?.toString().trim();
    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json({ error: 'Alamat wallet tidak valid' }, { status: 400 });
    }
    const nonce = await issueNonce(address);
    return NextResponse.json({ nonce }, { status: 200 });
  } catch (error) {
    console.error('Nonce API Error:', error);
    return NextResponse.json({ error: 'Gagal memproses nonce' }, { status: 500 });
  }
}
