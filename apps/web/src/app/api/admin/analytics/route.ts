import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/admin-guard';
import { getPublicClient, getServerChainId } from '@/lib/chain';
import { getContractAddresses } from '@/config/contracts';

/**
 * Analytics testnet sesuai spesifikasi §65:
 * akuisisi · engagement · merit · simulasi finansial.
 */
export async function GET(req: Request) {
  const denied = checkAdminAccess(req);
  if (denied) return denied;

  try {
    // ---- Akuisisi ----
    const [walletsConnected, emailVerified, usernamesCreated] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isEmailVerified: true } }),
      prisma.user.count({ where: { username: { not: '' } } }),
    ]);

    // ---- Engagement ----
    const [poolsViewedAgg, poolsJoined, obligationsCompleted, obligationsActive, bidAgg, distinctBidders] =
      await Promise.all([
        prisma.pool.aggregate({ _sum: { viewCount: true } }),
        prisma.poolMember.count(),
        prisma.obligation.count({ where: { status: 'COMPLETED' } }),
        prisma.obligation.count({ where: { status: 'ACTIVE' } }),
        prisma.bid.aggregate({ _count: true, _sum: { amount: true } }),
        prisma.bid.findMany({ select: { userWallet: true }, distinct: ['userWallet'] }),
      ]);

    // ---- Merit ----
    const [avgMeritAgg, tierRows, repEvents] = await Promise.all([
      prisma.user.aggregate({ _avg: { meritScore: true } }),
      prisma.user.groupBy({ by: ['tier'], _count: true }),
      prisma.reputationEvent.count(),
    ]);
    const tierDistribution = Object.fromEntries(tierRows.map((t) => [t.tier, t._count]));

    // ---- Finansial (simulasi) ----
    const [paidCount, missedCount, contribSum, payoutAgg, discountPayouts] = await Promise.all([
      prisma.contribution.count({ where: { status: { in: ['PAID', 'LATE'] } } }),
      prisma.contribution.count({ where: { status: 'MISSED' } }),
      prisma.contribution.aggregate({
        where: { status: { in: ['PAID', 'LATE'] } },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({ _count: true, _sum: { payoutAmount: true, surplus: true } }),
      prisma.payout.findMany({
        where: { discount: { gt: 0 }, nominalAmount: { gt: 0 } },
        select: { discount: true, nominalAmount: true },
      }),
    ]);

    const expectedTotal = paidCount + missedCount;
    const contributionSuccessRate = expectedTotal > 0 ? paidCount / expectedTotal : null;
    const simulatedDefaultRate = expectedTotal > 0 ? missedCount / expectedTotal : null;
    const avgAuctionDiscount =
      discountPayouts.length > 0
        ? discountPayouts.reduce((s, p) => s + p.discount / p.nominalAmount, 0) / discountPayouts.length
        : null;

    // ---- Saldo reserve/treasury on-chain ----
    const client = getPublicClient();
    const addresses = getContractAddresses(getServerChainId());
    const mcAbi = [
      { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
    ] as const;
    async function bal(addr?: string | null): Promise<number | null> {
      if (!addr) return null;
      try {
        const v = (await client.readContract({
          address: addresses.mcToken,
          abi: mcAbi,
          functionName: 'balanceOf',
          args: [addr.toLowerCase() as `0x${string}`],
        } as never)) as bigint;
        return Number(v) / 1e18;
      } catch {
        return null;
      }
    }
    const [reserveMc, treasuryMc] = await Promise.all([
      bal(process.env.RESERVE_ADDRESS),
      bal(process.env.TREASURY_ADDRESS),
    ]);
    const reserveUtilization =
      reserveMc !== null && (payoutAgg._sum.surplus ?? 0) > 0
        ? 1 - reserveMc / (reserveMc + (payoutAgg._sum.surplus ?? 0))
        : null; // proporsi surplus yang sudah terpakai (0 = utuh)

    return NextResponse.json(
      {
        acquisition: { walletsConnected, emailVerified, usernamesCreated },
        engagement: {
          poolsViewed: poolsViewedAgg._sum.viewCount ?? 0,
          poolJoins: poolsJoined,
          poolCompletions: obligationsCompleted,
          completionRate:
            obligationsCompleted + obligationsActive > 0
              ? obligationsCompleted / (obligationsCompleted + obligationsActive)
              : null,
          auctionBids: bidAgg._count ?? 0,
          auctionParticipants: distinctBidders.length,
        },
        merit: {
          averageMerit: avgMeritAgg._avg.meritScore ?? 0,
          tierDistribution,
          reputationEvents: repEvents,
          note: 'time-to-tier presisi butuh snapshot historis — tersedia pada closed beta via reputation_events',
        },
        financial: {
          contributionSuccessRate,
          simulatedDefaultRate,
          totalContributedMc: contribSum._sum.amount ?? 0,
          payouts: payoutAgg._count ?? 0,
          totalPaidOutMc: payoutAgg._sum.payoutAmount ?? 0,
          totalSurplusMc: payoutAgg._sum.surplus ?? 0,
          avgAuctionDiscount,
          reserveMc,
          treasuryMc,
          reserveUtilization,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Admin analytics API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
