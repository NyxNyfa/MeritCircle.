// Otak Merit Queue (spesifikasi §46) — dipakai /api/pools/designation dan keeper.
import { prisma } from '@/lib/prisma'
import { privateKeyToAccount } from 'viem/accounts'
import { keccak256, encodePacked } from 'viem'
import {
  readPoolState,
  readCohortState,
  readCurrentCohort,
  readCohortMembers,
  readHasWon,
  readHasContributed,
} from '@/lib/chain'

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

export async function computeDesignation(poolIdOnChain: number, cohortIdParam?: bigint): Promise<Designation> {
  // 1. Dapatkan cohort aktif
  let targetCohortId = cohortIdParam
  if (!targetCohortId) {
    const currentC = await readCurrentCohort(poolIdOnChain)
    for (let c = BigInt(1); c <= currentC; c++) {
      const cState = await readCohortState(poolIdOnChain, c).catch(() => null)
      if (cState && cState.status === 1) {
        targetCohortId = c
        break
      }
    }
  }
  if (!targetCohortId) targetCohortId = BigInt(1)

  // 2. State cohort on-chain (sumber kebenaran round/cycle/status)
  const state = await readCohortState(poolIdOnChain, targetCohortId)
  if (state.status !== 1) {
    throw new DesignationError(`Cohort ${targetCohortId} tidak dalam status ACTIVE`, 409)
  }
  const round = state.round
  const cycle = state.activeCycle

  // 3. Anggota cohort on-chain + data user di database
  const onChainMembers = await readCohortMembers(poolIdOnChain, targetCohortId).catch(() => [] as `0x${string}`[])
  const pool = await prisma.pool.findUnique({
    where: { poolIdOnChain },
    include: { members: { include: { user: true } } },
  })
  if (!pool) throw new DesignationError('Pool tidak ditemukan', 404)

  const candidateWallets = onChainMembers.length > 0
    ? onChainMembers
    : pool.members.map((m) => m.userId.toLowerCase() as `0x${string}`)

  const users = await prisma.user.findMany({
    where: { walletAddress: { in: candidateWallets.map((w) => w.toLowerCase()) } },
  })
  const userMap = new Map(users.map((u) => [u.walletAddress.toLowerCase(), u]))

  const ranked = candidateWallets
    .map((wallet) => {
      const u = userMap.get(wallet.toLowerCase())
      return {
        wallet: wallet.toLowerCase() as `0x${string}`,
        meritScore: u?.meritScore ?? 0,
      }
    })
    .sort(
      (a, b) =>
        b.meritScore - a.meritScore ||
        a.wallet.localeCompare(b.wallet),
    )

  // 4. Kandidat pertama yang memenuhi syarat on-chain:
  //    belum pernah menang di cohort ini + sudah kontribusi cycle berjalan
  for (const candidate of ranked) {
    const won = await readHasWon(poolIdOnChain, targetCohortId, candidate.wallet)
    if (won) continue
    const contributed =
      (await readHasContributed(poolIdOnChain, targetCohortId, cycle, candidate.wallet)) ||
      state.collected === BigInt(0)
    if (!contributed) continue

    const privateKey = process.env.BACKEND_PRIVATE_KEY
    if (!privateKey) throw new DesignationError('BACKEND_PRIVATE_KEY belum disetting di .env', 500)
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
    const account = privateKeyToAccount(formattedKey as `0x${string}`)

    const messageHash = keccak256(
      encodePacked(
        ['uint256', 'uint256', 'uint256', 'address'],
        [BigInt(poolIdOnChain), targetCohortId, cycle, candidate.wallet as `0x${string}`],
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
