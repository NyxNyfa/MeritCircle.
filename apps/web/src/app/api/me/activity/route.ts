import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

/**
 * Riwayat aktivitas nyata user untuk halaman profil:
 * kontribusi, payout, kewajiban, on-time rate, dan ringkasan merit.
 */
export async function GET(req: Request) {
  try {
    const wallet = await authenticateRequest(req);
    if (!wallet) {
      return NextResponse.json({ error: 'Verifikasi wallet dibutuhkan' }, { status: 401 });
    }

    const [contributions, payouts, obligations, pools] = await Promise.all([
      prisma.contribution.findMany({
        where: { userWallet: wallet },
        orderBy: [{ poolIdOnChain: 'asc' }, { cycle: 'asc' }],
      }),
      prisma.payout.findMany({
        where: { userWallet: wallet },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.obligation.findMany({
        where: { userWallet: wallet },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.pool.findMany(),
    ]);

    const poolNameById = new Map(pools.map((p) => [p.poolIdOnChain, p.name]));

    const paid = contributions.filter((c) => c.status === 'PAID');
    const late = contributions.filter((c) => c.status === 'LATE');
    const missed = contributions.filter((c) => c.status === 'MISSED');
    const expected = paid.length + missed.length;
    const onTimeRate =
      expected > 0 ? Math.round(((paid.length - late.length * 0.5) / expected) * 100) : null;

    const totalContributed = paid.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalReceived = payouts.reduce((sum, p) => sum + p.payoutAmount, 0);

    return NextResponse.json(
      {
        summary: {
          onTimeRate,
          totalContributed,
          totalReceived,
          completedPools: obligations.filter((o) => o.status === 'COMPLETED').length,
          activeObligations: obligations.filter((o) => o.status === 'ACTIVE').length,
          missedCycles: missed.length,
        },
        contributions: contributions.map((c) => ({
          poolIdOnChain: c.poolIdOnChain,
          round: c.round,
          cycle: c.cycle,
          poolName: poolNameById.get(c.poolIdOnChain) ?? `Pool ${c.poolIdOnChain}`,
          amount: c.amount,
          status: c.status,
          paidAt: c.paidAt,
        })),
        payouts: payouts.map((p) => ({
          poolIdOnChain: p.poolIdOnChain,
          round: p.round,
          cycle: p.cycle,
          poolName: poolNameById.get(p.poolIdOnChain) ?? `Pool ${p.poolIdOnChain}`,
          nominalAmount: p.nominalAmount,
          payoutAmount: p.payoutAmount,
          discount: p.discount,
          surplus: p.surplus,
          createdAt: p.createdAt,
        })),
        obligations: obligations.map((o) => ({
          poolIdOnChain: o.poolIdOnChain,
          round: o.round,
          poolName: poolNameById.get(o.poolIdOnChain) ?? `Pool ${o.poolIdOnChain}`,
          status: o.status,
          contributedCycles: o.contributedCycles,
          missedCycles: o.missedCycles,
          totalCycles: o.totalCycles,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Activity API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
