// Merit Engine — model skor berbobot spesifikasi §12:
//   on-time 35% · completed pools 25% · konsistensi 15% · tenure 10% · payout completion 10% · behavior 5%
// Skor baru selalu dihitung penuh dari data (deterministik), lalu dibandingkan dengan skor lama;
// perubahan dicatat ke ReputationEvent sebagai audit trail.
import { prisma } from '@/lib/prisma'
import { calculateTier } from '@/lib/tier'

const W = {
  ON_TIME: 35,
  COMPLETED: 25,
  CONSISTENCY: 15,
  TENURE: 10,
  PAYOUT: 10,
  BEHAVIOR: 5,
} as const

const TENURE_FULL_DAYS = 60
const PENALTY_PER_DEFAULT = 2
// Faktor kematangan: komponen rasio mencapai nilai penuh hanya setelah volume aktivitas cukup,
// agar satu pool kecil tidak melompatkan user langsung ke tier tinggi (anti-farming §51).
const ON_TIME_FULL_AT = 9 // ± 3 pool Basic atau 1 pool Trusted
const CONSISTENCY_FULL_AT = 6
const PAYOUT_FULL_AT = 2

export type MeritBreakdown = {
  onTime: number
  completed: number
  consistency: number
  tenure: number
  payout: number
  behavior: number
  raw: number
}

export async function computeBreakdown(wallet: string): Promise<MeritBreakdown> {
  const [contributions, obligations, payouts, memberships] = await Promise.all([
    prisma.contribution.findMany({
      where: { userWallet: wallet },
      select: { status: true },
    }),
    prisma.obligation.findMany({
      where: { userWallet: wallet },
      select: { status: true, poolIdOnChain: true, round: true, missedCycles: true },
    }),
    prisma.payout.findMany({
      where: { userWallet: wallet },
      select: { poolIdOnChain: true, round: true },
    }),
    prisma.poolMember.findMany({
      where: { userId: wallet },
      select: { joinedAt: true },
    }),
  ])

  const paid = contributions.filter((c) => c.status === 'PAID' || c.status === 'LATE')
  const late = contributions.filter((c) => c.status === 'LATE')
  const missed = contributions.filter((c) => c.status === 'MISSED')
  const expected = paid.length + missed.length

  // 1. On-time contribution (35) — rasio iuran tepat waktu, diskalakan volume aktivitas
  const onTimeRatio = expected > 0 ? (paid.length - late.length * 0.5) / expected : 0
  const onTimeMaturity = Math.min(1, expected / ON_TIME_FULL_AT)
  const onTime = Math.round(onTimeRatio * W.ON_TIME * onTimeMaturity)

  // 2. Completed pools (25) — penyelesaian pool penuh; progresif antar pool
  const completedPools = obligations.filter((o) => o.status === 'COMPLETED').length
  const completed = Math.min(W.COMPLETED, completedPools * 8)

  // 3. Konsistensi (15) — tanpa catatan MISS sepanjang riwayat aktif
  const missRatio = expected > 0 ? missed.length / expected : 1
  const hasActivity = expected > 0
  const consistencyMaturity = Math.min(1, expected / CONSISTENCY_FULL_AT)
  const consistency =
    hasActivity ? Math.round((1 - missRatio) * W.CONSISTENCY * consistencyMaturity) : 0

  // 4. Tenure (10) — hari sejak keanggotaan pool pertama
  let tenure = 0
  if (memberships.length > 0) {
    const firstJoin = Math.min(...memberships.map((m) => m.joinedAt.getTime()))
    const days = (Date.now() - firstJoin) / 86_400_000
    tenure = Math.min(W.TENURE, Math.floor((days / TENURE_FULL_DAYS) * W.TENURE))
  }

  // 5. Payout completion (10) — payout yang diikuti penyelesaian pool oleh penerimanya
  let payout = 0
  if (payouts.length > 0) {
    const keys = new Set(
      obligations
        .filter((o) => o.status === 'COMPLETED')
        .map((o) => `${o.poolIdOnChain}:${o.round}`),
    )
    const followed = payouts.filter((p) => keys.has(`${p.poolIdOnChain}:${p.round}`)).length
    const payoutMaturity = Math.min(1, payouts.length / PAYOUT_FULL_AT)
    payout = Math.round((followed / payouts.length) * W.PAYOUT * payoutMaturity)
  }

  // 6. Behavior (5) — hanya dihitung saat ada aktivitas; tiap default memotong
  const defaults = obligations.reduce((sum, o) => sum + o.missedCycles, 0)
  const behavior = hasActivity ? Math.max(0, W.BEHAVIOR - defaults * PENALTY_PER_DEFAULT) : 0

  const raw = onTime + completed + consistency + tenure + payout + behavior
  return {
    onTime,
    completed,
    consistency,
    tenure,
    payout,
    behavior,
    raw: Math.max(0, Math.min(100, raw)),
  }
}

/**
 * Hitung ulang merit user dari seluruh riwayat, simpan, dan catat delta ke ledger.
 * Aman dipanggil berulang kali (idempotent untuk skor; ledger hanya terisi saat berubah).
 */
export async function recalcMerit(
  wallet: string,
  trigger: string,
): Promise<{ oldScore: number; newScore: number; delta: number; tier: number }> {
  const normalized = wallet.toLowerCase()
  const user = await prisma.user.findUnique({ where: { walletAddress: normalized } })
  if (!user) return { oldScore: 0, newScore: 0, delta: 0, tier: 0 }

  const breakdown = await computeBreakdown(normalized)
  const newScore = breakdown.raw
  const delta = newScore - user.meritScore

  await prisma.user.update({
    where: { walletAddress: normalized },
    data: { meritScore: newScore, tier: calculateTier(newScore) },
  })

  if (delta !== 0) {
    await prisma.reputationEvent.create({
      data: {
        userWallet: normalized,
        eventType: trigger || 'adjustment',
        pointsDelta: delta,
        detail: JSON.stringify(breakdown),
      },
    })
  }

  return { oldScore: user.meritScore, newScore, delta, tier: calculateTier(newScore) }
}

/** Recalc merit untuk banyak wallet sekaligus (dipakai saat pool selesai). */
export async function recalcMeritMany(wallets: string[], trigger: string): Promise<void> {
  const uniq = [...new Set(wallets.map((w) => w.toLowerCase()))]
  await Promise.all(uniq.map((w) => recalcMerit(w, trigger).catch(() => undefined)))
}
