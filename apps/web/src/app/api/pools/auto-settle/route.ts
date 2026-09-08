// apps/web/src/app/api/pools/auto-settle/route.ts
// Automatic Keeper Service: Otomatis mendeteksi pool yang siap undi, mengeksekusi settleCycle on-chain,
// mentransfer hadiah langsung ke pemenang, dan mengirimkan notifikasi.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeDesignation } from '@/lib/designation';
import {
  getPublicClient,
  getMeritPoolAddress,
  readIsSettleable,
  readPoolState,
  readCurrentCohort,
  readCohortState,
  readIsCohortSettleable,
} from '@/lib/chain';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry, bscTestnet } from 'viem/chains';
import { MERITPOOL_ABI } from '@/config/contracts';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const poolIdOnChain = Number(body.poolIdOnChain);

    const poolIdsToCheck = Number.isInteger(poolIdOnChain) && poolIdOnChain >= 0
      ? [poolIdOnChain]
      : [0, 1, 2, 3, 4, 5];

    const results = [];

    const privateKey = process.env.BACKEND_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'BACKEND_PRIVATE_KEY belum disetting' }, { status: 500 });
    }
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);

    const chainId = Number(process.env.CHAIN_ID ?? 31337);
    const walletClient = createWalletClient({
      account,
      chain: chainId === 97 ? bscTestnet : foundry,
      transport: http(process.env.RPC_URL ?? (chainId === 97 ? 'https://bsc-testnet-dataseed.bnbchain.org' : 'http://127.0.0.1:8545')),
    });

    for (const id of poolIdsToCheck) {
      const currentC = await readCurrentCohort(id).catch(() => BigInt(1));

      for (let c = BigInt(1); c <= currentC; c++) {
        const cState = await readCohortState(id, c).catch(() => null);
        if (!cState || cState.status !== 1) continue; // Hanya periksa cohort aktif (ACTIVE = 1)

        const settleable = await readIsCohortSettleable(id, c).catch(() => false);
        if (!settleable) continue;

        try {
          // 1. Dapatkan designation pemenang dan signature backend untuk cohort ini
          const des = await computeDesignation(id, c);

          // 2. Eksekusi settleCycle langsung on-chain oleh wallet backend
          const hash = await walletClient.writeContract({
            address: getMeritPoolAddress(),
            abi: MERITPOOL_ABI,
            functionName: 'settleCycle',
            args: [BigInt(id), c, des.winner as `0x${string}`, des.signature],
          });

          // 3. Catat di database payout
          const pool = await prisma.pool.findUnique({ where: { poolIdOnChain: id } });
          if (pool) {
            const nominal = pool.contributionAmount * pool.poolSize;
            await prisma.payout.create({
              data: {
                poolIdOnChain: id,
                round: Number(des.round),
                cycle: Number(des.cycle),
                userWallet: des.winner.toLowerCase(),
                payoutAmount: nominal,
                nominalAmount: nominal,
                discount: 0,
                surplus: 0,
                txHash: hash,
              },
            });

            // 4. Buat notifikasi ucapan selamat untuk pemenang
            await prisma.notification.create({
              data: {
                userWallet: des.winner.toLowerCase(),
                type: 'PAYOUT_WON',
                title: `🏆 Selamat! Anda Memenangkan Arisan ${pool.name}!`,
                body: `Total hadiah ${nominal} MC pada Siklus ${des.cycle} telah ditransfer langsung ke dompet Anda.`,
              },
            });

            // 5. Update user pemenang di pool
            await prisma.pool.update({
              where: { poolIdOnChain: id },
              data: {
                lastWinnerAddress: des.winner.toLowerCase(),
              },
            });

            // 6. Jika semua siklus selesai, buka kunci anggota kelompok ini
            if (Number(des.cycle) >= pool.poolSize) {
              await prisma.obligation.updateMany({
                where: { poolIdOnChain: id, status: 'ACTIVE' },
                data: { status: 'COMPLETED' },
              });
              await prisma.poolMember.deleteMany({
                where: { poolId: pool.id },
              });
            }
          }

          results.push({ poolId: id, cohortId: Number(c), settled: true, winner: des.winner, txHash: hash });
        } catch (err) {
          console.error(`Auto-settle failed for pool ${id} cohort ${c}:`, err);
        }
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Auto-settle API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
