// Otak Merit Queue (spesifikasi §46) — dipakai /api/pools/designation dan keeper.
import { prisma } from '@/lib/prisma'
import { privateKeyToAccount } from 'viem/accounts'
import { keccak256, encodePacked } from 'viem'
import { readPoolState, readHasWon, readHasContributed } from '@/lib/chain'

export type Designation = {
  poolIdOnChain: number
  round: string
  cycle: string
  winner: string
  meritScore: number
  signature: `0x${string}`
}

export class DesignationError extends Error {
  status: number
  constructor(message: string, status = 409) {
    super(message)
    this.status = status
  }
}

export async function computeDesignation(poolIdOnChain: number): Promise<Designation> {
  // 1. State pool on-chain (sumber kebenaran round/cycle/status)
  const state = await readPoolState(poolIdOnChain)
  if (state.status !== 1) {
    throw new DesignationError('Pool tidak dalam status ACTIVE', 409)
  }
  const round = state.round
  const cycle = state.activeCycle

  // 2. Anggota pool (mirror off-chain) diurutkan sesuai Merit Queue:
  //    meritScore DESC -> tenure ASC -> wallet ASC (tie-break deterministik)
  const pool = await prisma.pool.findUnique({
    where: { poolIdOnChain },
    include: { members: { include: { user: true } } },
  })
  if (!pool) throw new DesignationError('Pool tidak ditemukan', 404)

  const ranked = pool.members
    .map((m) => ({
      wallet: m.user.walletAddress,
      meritScore: m.user.meritScore,
      joinedAt: m.joinedAt.getTime(),
    }))
    .sort(
      (a, b) =>
        b.meritScore - a.meritScore ||
        a.joinedAt - b.joinedAt ||
        a.wallet.localeCompare(b.wallet),
    )

  // 3. Kandidat pertama yang memenuhi syarat on-chain:
  //    belum pernah menang round ini + sudah kontribusi cycle berjalan
  //    (atau collected == 0 — kasus ekstrem semua default).
  for (const candidate of ranked) {
    const won = await readHasWon(poolIdOnChain, candidate.wallet)
    if (won) continue
    const contributed =
      (await readHasContributed(poolIdOnChain, cycle, candidate.wallet)) ||
      state.collected === BigInt(0)
    if (!contributed) continue

    const privateKey = process.env.BACKEND_PRIVATE_KEY
    if (!privateKey) throw new DesignationError('BACKEND_PRIVATE_KEY belum disetting di .env', 500)
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
    const account = privateKeyToAccount(formattedKey as `0x${string}`)

    const messageHash = keccak256(
      encodePacked(
        ['uint256', 'uint256', 'uint256', 'address'],
        [BigInt(poolIdOnChain), round, cycle, candidate.wallet as `0x${string}`],
      ),
    )
    const signature = await account.signMessage({ message: { raw: messageHash } })

    return {
      poolIdOnChain,
      round: round.toString(),
      cycle: cycle.toString(),
      winner: candidate.wallet,
      meritScore: candidate.meritScore,
      signature,
    }
  }

  throw new DesignationError('Tidak ada anggota yang memenuhi syarat designation', 409)
}
