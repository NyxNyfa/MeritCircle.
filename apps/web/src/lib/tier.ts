// Sumber tunggal rumus Tier — sesuai spesifikasi Merit Pool §5/§14:
// Score 0 → Tier 0 | 1–20 → T1 | 21–50 → T2 | 51–75 → T3 | 76–90 → T4 | 91–100 → T5
export const MERIT_SCORE_MIN = 0
export const MERIT_SCORE_MAX = 100

const TIER_BANDS: ReadonlyArray<{ min: number; tier: number }> = [
  { min: 91, tier: 5 },
  { min: 76, tier: 4 },
  { min: 51, tier: 3 },
  { min: 21, tier: 2 },
  { min: 1, tier: 1 },
]

export function calculateTier(rawScore: number): number {
  const score = Math.max(MERIT_SCORE_MIN, Math.min(MERIT_SCORE_MAX, Math.floor(rawScore)))
  for (const band of TIER_BANDS) {
    if (score >= band.min) return band.tier
  }
  return 0
}

export function clampMeritScore(score: number): number {
  return Math.max(MERIT_SCORE_MIN, Math.min(MERIT_SCORE_MAX, Math.floor(score)))
}
