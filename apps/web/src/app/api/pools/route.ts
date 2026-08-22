import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Tarik semua pool dari database, urutkan dari tier terendah
    const pools = await prisma.pool.findMany({
      orderBy: { tierRequired: 'asc' },
      include: {
        _count: { select: { members: true } },
      },
    });

    // Flatten _count jadi memberCount agar mudah dikonsumsi frontend
    const response = pools.map(
      ({ _count, ...pool }: (typeof pools)[number]) => ({
        ...pool,
        memberCount: _count.members,
      })
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("API Pools Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}