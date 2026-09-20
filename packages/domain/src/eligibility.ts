import { getTierFromPoints } from "./tier";
import { PoolSnapshot, UserProfileSnapshot } from "./types";

/**
 * Validates whether a user is eligible to join a pool based on platform requirements,
 * tier thresholds, and active group limits.
 *
 * Rejection conditions:
 * - Pool status is not "ACTIVE"
 * - User has not set a username
 * - User email is not verified
 * - User tier is below the pool's minimumTier requirement
 * - User's active group count reaches or exceeds their tier limit
 *
 * @param params Object containing user and pool snapshots
 * @returns Result object indicating allowed status and optional rejection reason
 */
export function canJoinPool(params: {
  user: UserProfileSnapshot;
  pool: PoolSnapshot;
}): {
  allowed: boolean;
  reason?: string;
} {
  const { user, pool } = params;

  if (pool.status !== "ACTIVE") {
    return {
      allowed: false,
      reason: "Pool is not currently active",
    };
  }

  if (!user.hasUsername) {
    return {
      allowed: false,
      reason: "User must configure a username before joining a pool",
    };
  }

  if (!user.emailVerified) {
    return {
      allowed: false,
      reason: "User email address must be verified before joining a pool",
    };
  }

  const userTier = getTierFromPoints(user.reputationPoint);

  if (userTier.tier < pool.minimumTier) {
    return {
      allowed: false,
      reason: `User reputation tier (${userTier.name}, Tier ${userTier.tier}) does not meet pool minimum requirement (Tier ${pool.minimumTier})`,
    };
  }

  if (user.activeGroupCount >= userTier.maxActiveGroups) {
    return {
      allowed: false,
      reason: `User has reached the maximum allowed active groups (${userTier.maxActiveGroups}) for Tier ${userTier.tier}`,
    };
  }

  return {
    allowed: true,
  };
}
