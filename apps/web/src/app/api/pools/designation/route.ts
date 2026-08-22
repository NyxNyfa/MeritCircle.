// apps/web/src/app/api/pools/designation/route.ts
// Otak Merit Queue (spesifikasi §46): menentukan penerima payout cycle berjalan
// dan menandatanganinya untuk kontrak (poolId, round, cycle, winner).
//
// Urutan prioritas: meritScore DESC -> joinedAt ASC (tenure) -> wallet ASC (tie-break deterministik).
// Kontrak tetap memvalidasi ulang: anggota, sudah kontribusi cycle ini, belum pernah menang.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked } from 'viem';
import { readPoolState, readHasWon, readHasContributed } from '@/lib/chain';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const poolIdOnChain = Number(body.poolIdOnChain);
    if (!Number.isInteger(poolIdOnChain) || poolIdOnChain < 0) {
      return NextResponse.json({ error: 'poolIdOnChain tidak valid' }, { status: 400 });
    }

    // 1. State pool on-chain (sumber kebenaran round/cycle/status)
    const state = await readPoolState(poolIdOnChain);
    if (state.status !== 1) {
      return NextResponse.json({ error: 'Pool tidak dalam status ACTIVE' }, { status: 409 });
    }
    const round = body.round !== undefined ? BigInt(body.round) : state.round;
    const cycle = body.cycle !== undefined ? BigInt(body.cycle) : state.activeCycle;

    // 2. Anggota pool (mirror off-chain) diurutkan sesuai Merit Queue
    const pool = await prisma.pool.findUnique({
      where: { poolIdOnChain },
      include: { members: { include: { user: true } } },
    });
    if (!pool) {
      return NextResponse.json({ error: 'Pool tidak ditemukan' }, { status: 404 });
    }

    const ranked = pool.members
      .map((m) => ({
        wallet: m.user.walletAddress,
        meritScore: m.user.meritScore,
        tier: m.user.tier,
        joinedAt: m.joinedAt.getTime(),
      }))
      .sort(
        (a, b) =>
          b.meritScore - a.meritScore ||
          a.joinedAt - b.joinedAt ||
          a.wallet.localeCompare(b.wallet),
      );

    // 3. Pilih kandidat pertama yang memenuhi syarat on-chain:
    //    belum pernah menang di round ini + sudah kontribusi cycle berjalan.
    for (const candidate of ranked) {
      const won = await readHasWon(poolIdOnChain, candidate.wallet);
      if (won) continue;
      const contributed =
        (await readHasContributed(poolIdOnChain, cycle, candidate.wallet)) || state.collected === BigInt(0);
      if (!contributed) continue;

      // 4. Tanda tangani designation
      const privateKey = process.env.BACKEND_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('BACKEND_PRIVATE_KEY belum disetting di .env');
      }
      const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      const account = privateKeyToAccount(formattedKey as `0x${string}`);

      const messageHash = keccak256(
        encodePacked(
          ['uint256', 'uint256', 'uint256', 'address'],
          [BigInt(poolIdOnChain), round, cycle, candidate.wallet as `0x${string}`],
        ),
      );
      const signature = await account.signMessage({ message: { raw: messageHash } });

      return NextResponse.json(
        {
          poolIdOnChain,
          round: round.toString(),
          cycle: cycle.toString(),
          winner: candidate.wallet,
          meritScore: candidate.meritScore,
          signature,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { error: 'Tidak ada anggota yang memenuhi syarat designation' },
      { status: 409 },
    );
  } catch (error) {
    console.error('Designation API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
