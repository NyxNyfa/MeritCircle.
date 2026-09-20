/**
 * Clamps reputation points to the valid range [0, 1000].
 *
 * @param points Raw reputation points
 * @returns Number clamped between 0 and 1000
 */
export function clampReputationPoints(points: number): number {
  if (Number.isNaN(points)) {
    return 0;
  }
  return Math.min(1000, Math.max(0, points));
}
