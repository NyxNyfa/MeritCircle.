import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Detail pool untuk halaman /pools/[id] (id = poolIdOnChain):
 * anggota + username, kontribusi cycle berjalan, riwayat payout, dan bid auction.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolved = await params;
    const poolIdOnChain = Number(resolved.id);
    if (!Number.isInteger(poolIdOnChain) || poolIdOnChain < 0) {
      return NextResponse.json({ error: 'ID pool tidak valid' }, { status: 400 });
    }

    const pool = await prisma.pool.findUnique({ where: { poolIdOnChain } });
    if (!pool) {
      return NextResponse.json({ error: 'Pool tidak ditemukan' }, { status: 404 });
    }

    const memberships = await prisma.poolMember.findMany({
      where: { poolId: pool.id },
      include: {
        user: {
          select: { walletAddress: true, username: true, meritScore: true, tier: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const [payouts, currentAuction] = await Promise.all([
      prisma.payout.findMany({
        where: { poolIdOnChain },
        orderBy: [{ round: 'desc' }, { cycle: 'desc' }],
        take: 30,
      }),
      prisma.auction.findFirst({
        where: { poolIdOnChain },
        orderBy: [{ round: 'desc' }, { cycle: 'desc' }],
        include: { bids: { orderBy: { amount: 'asc' } } },
      }),
    ]);

    const wallets = [...new Set(payouts.map((p) => p.userWallet))];
    const users = await prisma.user.findMany({
      where: { walletAddress: { in: wallets } },
      select: { walletAddress: true, username: true },
    });
    const usernameByWallet = new Map(users.map((u) => [u.walletAddress, u.username]));

    const bids = (currentAuction?.bids ?? []).map((b) => ({
      userWallet: b.userWallet,
      username: usernameByWallet.get(b.userWallet) ?? null,
      amount: b.amount,
      createdAt: b.createdAt,
    }));

    return NextResponse.json(
      {
        pool: {
          id: pool.id,
          poolIdOnChain: pool.poolIdOnChain,
          name: pool.name,
          tierRequired: pool.tierRequired,
          contributionAmount: pool.contributionAmount,
          poolSize: pool.poolSize,
          totalYield: pool.totalYield,
          isAuctionMode: pool.isAuctionMode,
          lastWinnerUsername: pool.lastWinnerUsername,
          lastWinnerAddress: pool.lastWinnerAddress,
        },
        members: memberships.map((m) => ({
          wallet: m.userId,
          username: m.user.username,
          meritScore: m.user.meritScore,
          tier: m.user.tier,
          joinedAt: m.joinedAt,
        })),
        payoutsHistory: payouts.map((p) => ({
          round: p.round,
          cycle: p.cycle,
          winnerWallet: p.userWallet,
          winnerUsername: usernameByWallet.get(p.userWallet) ?? null,
          payoutAmount: p.payoutAmount,
          nominalAmount: p.nominalAmount,
          discount: p.discount,
          surplus: p.surplus,
          createdAt: p.createdAt,
        })),
        auction: currentAuction
          ? {
              status: currentAuction.status,
              winningBid: currentAuction.winningBid,
              winnerWallet: currentAuction.winnerWallet,
              surplus: currentAuction.surplus,
              bids,
            }
          : null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Pool detail API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
