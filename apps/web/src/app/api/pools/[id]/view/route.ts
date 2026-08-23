import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Tambah penghitung view pool (metrik engagement §65). Idempotent-friendly: naik 1 per panggilan. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolved = await params;
    const poolIdOnChain = Number(resolved.id);
    if (!Number.isInteger(poolIdOnChain) || poolIdOnChain < 0) {
      return NextResponse.json({ error: 'ID pool tidak valid' }, { status: 400 });
    }

    const result = await prisma.pool.updateMany({
      where: { poolIdOnChain },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: result.count > 0 }, { status: 200 });
  } catch (error) {
    console.error('Pool view API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
