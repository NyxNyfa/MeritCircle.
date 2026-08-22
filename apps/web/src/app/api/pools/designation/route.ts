import { NextResponse } from 'next/server';
import { computeDesignation, DesignationError } from '@/lib/designation';

/**
 * Endpoint penandatanganan Merit Queue: backend menentukan penerima payout
 * cycle berjalan (urutan merit -> tenure -> deterministik) dan menandatanganinya.
 * Kontrak tetap memvalidasi ulang seluruh syarat eligibility.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const poolIdOnChain = Number(body.poolIdOnChain);
    if (!Number.isInteger(poolIdOnChain) || poolIdOnChain < 0) {
      return NextResponse.json({ error: 'poolIdOnChain tidak valid' }, { status: 400 });
    }

    const designation = await computeDesignation(poolIdOnChain);
    return NextResponse.json(designation, { status: 200 });
  } catch (error) {
    if (error instanceof DesignationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Designation API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
