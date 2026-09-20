import { clampReputationPoints } from "./reputation";
import { TierInfo } from "./types";

export const TIERS: Record<1 | 2 | 3 | 4 | 5, TierInfo> = {
  1: {
    tier: 1,
    name: "Newcomer",
    minPoint: 0,
    maxPoint: 100,
    maxActiveGroups: 1,
  },
  2: {
    tier: 2,
    name: "Citizen",
    minPoint: 101,
    maxPoint: 400,
    maxActiveGroups: 2,
  },
  3: {
    tier: 3,
    name: "Builder",
    minPoint: 401,
    maxPoint: 700,
    maxActiveGroups: 3,
  },
  4: {
    tier: 4,
    name: "Trusted",
    minPoint: 701,
    maxPoint: 900,
    maxActiveGroups: 4,
  },
  5: {
    tier: 5,
    name: "Prime",
    minPoint: 901,
    maxPoint: 1000,
    maxActiveGroups: 5,
  },
};

/**
 * Resolves TierInfo based on user reputation points.
 * Points are clamped within [0, 1000].
 *
 * @param points Raw reputation points
 * @returns TierInfo matching points range
 */
export function getTierFromPoints(points: number): TierInfo {
  const clamped = clampReputationPoints(points);

  if (clamped <= 100) {
    return TIERS[1];
  }
  if (clamped <= 400) {
    return TIERS[2];
  }
  if (clamped <= 700) {
    return TIERS[3];
  }
  if (clamped <= 900) {
    return TIERS[4];
  }
  return TIERS[5];
}
