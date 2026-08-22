// apps/web/src/app/api/pools/join/route.ts
// Mencatat keanggotaan user di sebuah pool (off-chain) setelah tx joinPool sukses di-chain.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { walletAddress, poolId } = await req.json();

    if (!walletAddress || !poolId) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!user || !pool) {
      return NextResponse.json({ error: "User atau Pool tidak ditemukan" }, { status: 404 });
    }

    const membership = await prisma.poolMember.upsert({
      where: { userId_poolId: { userId: user.walletAddress, poolId: pool.id } },
      update: {},
      create: { userId: user.walletAddress, poolId: pool.id },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error("Pool Join API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}