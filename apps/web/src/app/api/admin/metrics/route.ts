import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/admin-guard';
import { getPublicClient, getServerChainId, readPoolState } from '@/lib/chain';
import { getContractAddresses } from '@/config/contracts';

/**
 * Metrik protokol untuk admin (spesifikasi §49/§53/§65).
 * Guard testnet: query param wallet harus sama dengan env ADMIN_WALLET.
 */
export async function GET(req: Request) {
  const denied = checkAdminAccess(req);
  if (denied) return denied;

  try {
    // ---- Agregat DB ----
    const [users, paidAgg, missedCount, payoutAgg, activeObligations, completedPools] = await Promise.all([
      prisma.user.count(),
      prisma.contribution.aggregate({
        where: { status: { in: ['PAID', 'LATE'] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.contribution.count({ where: { status: 'MISSED' } }),
      prisma.payout.aggregate({ _sum: { payoutAmount: true, surplus: true }, _count: true }),
      prisma.obligation.count({ where: { status: 'ACTIVE' } }),
      prisma.obligation.count({ where: { status: 'COMPLETED' } }),
    ]);

    // ---- Saldo on-chain ----
    const client = getPublicClient();
    const chainId = getServerChainId();
    const addresses = getContractAddresses(chainId);
    const mcAbi = [
      { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
    ] as const;
    async function bal(addr: string): Promise<number> {
      try {
        const v = (await client.readContract({
          address: addresses.mcToken,
          abi: mcAbi,
          functionName: 'balanceOf',
          args: [addr as `0x${string}`],
        } as never)) as bigint;
        return Number(v) / 1e18;
      } catch {
        return 0;
      }
    }

    const [poolBalanceMc, reserveMc, treasuryMc] = await Promise.all([
      bal(addresses.meritPool),
      addresses.meritPool === addresses.mcToken ? 0 : bal(process.env.RESERVE_ADDRESS ?? addresses.meritPool),
      bal(process.env.TREASURY_ADDRESS ?? addresses.meritPool),
    ]);

    // ---- Status pool on-chain ----
    const pools = [] as Array<{ poolIdOnChain: number; status: number; round: number; cycle: number; memberCount: number; collected: number }>;
    for (let id = 0; id <= 5; id++) {
      try {
        const s = await readPoolState(id);
        pools.push({
          poolIdOnChain: id,
          status: Number(s.status),
          round: Number(s.round),
          cycle: Number(s.activeCycle),
          memberCount: Number(s.memberCount),
          collected: Number(s.collected) / 1e18,
        });
      } catch {
        // kontrak tidak tersedia — lewati
      }
    }

    return NextResponse.json(
      {
        users,
        contributions: { paidCount: paidAgg._count ?? 0, totalPaidMc: paidAgg._sum.amount ?? 0, missedCount },
        payouts: { count: payoutAgg._count ?? 0, totalPaidMc: payoutAgg._sum.payoutAmount ?? 0, totalSurplusMc: payoutAgg._sum.surplus ?? 0 },
        obligations: { active: activeObligations, completed: completedPools },
        treasury: { meritPoolContractMc: poolBalanceMc, reserveMc, treasuryMc },
        pools,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Admin metrics API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
