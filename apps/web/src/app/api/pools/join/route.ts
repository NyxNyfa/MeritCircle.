// apps/web/src/app/api/pools/join/route.ts
// Mencatat keanggotaan user di sebuah pool (off-chain) setelah tx joinPool sukses di-chain.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Wajib bukti kepemilikan wallet — catatan keanggotaan hanya atas nama wallet sendiri
    const authedAddress = await authenticateRequest(req);
    if (!authedAddress) {
      return NextResponse.json({ error: 'Verifikasi wallet dibutuhkan' }, { status: 401 });
    }

    const { poolId } = await req.json();

    if (!poolId) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const walletAddress = authedAddress.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });
    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!user || !pool) {
      return NextResponse.json({ error: "User atau Pool tidak ditemukan" }, { status: 404 });
    }

    // Strict Lock-in check
    const existingMemberships = await prisma.poolMember.findMany({
      where: { userId: user.walletAddress },
      include: { pool: true },
    });
    if (existingMemberships.length > 0 && !existingMemberships.some((m) => m.poolId === pool.id)) {
      return NextResponse.json(
        { error: `Ditolak: Dompet Anda sudah terikat di ${existingMemberships[0].pool.name}` },
        { status: 403 },
      );
    }

    const currentCount = await prisma.poolMember.count({ where: { poolId: pool.id } });
    const cohortNumber = Math.floor(currentCount / pool.poolSize) + 1;

    const membership = await prisma.poolMember.upsert({
      where: { userId_poolId: { userId: user.walletAddress, poolId: pool.id } },
      update: {},
      create: { userId: user.walletAddress, poolId: pool.id },
    });

    // Catat kewajiban arisan aktif
    await prisma.obligation.upsert({
      where: {
        poolIdOnChain_round_userWallet: {
          poolIdOnChain: pool.poolIdOnChain,
          round: 0,
          userWallet: user.walletAddress,
        },
      },
      update: {},
      create: {
        poolIdOnChain: pool.poolIdOnChain,
        round: 0,
        userWallet: user.walletAddress,
        totalCycles: pool.poolSize,
        contributedCycles: 1,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error("Pool Join API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
