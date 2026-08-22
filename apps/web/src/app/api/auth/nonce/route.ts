import { NextResponse } from 'next/server';
import { issueNonce } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Alamat wallet tidak valid' }, { status: 400 });
    }
    const nonce = await issueNonce(address);
    return NextResponse.json({ nonce }, { status: 200 });
  } catch (error) {
    console.error('Nonce API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
