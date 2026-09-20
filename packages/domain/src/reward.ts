/**
 * Calculates the base cycle reward pool from group size and individual contribution amount.
 *
 * @param groupSize Number of members in the group
 * @param contributionAmountWei Individual contribution amount in wei
 * @returns Total base reward for the cycle in wei
 */
export function calculateBaseReward(
  groupSize: number,
  contributionAmountWei: bigint
): bigint {
  if (groupSize < 0) {
    throw new Error("Group size cannot be negative");
  }
  if (contributionAmountWei < 0n) {
    throw new Error("Contribution amount cannot be negative");
  }
  return BigInt(groupSize) * contributionAmountWei;
}

/**
 * Calculates the effective reward pool by combining the cycle's base reward and carried reward.
 *
 * @param baseRewardWei Base reward from current cycle contributions
 * @param carriedRewardWei Carried over reward from previous cycle surplus
 * @returns Total reward pool in wei
 */
export function calculateRewardPool(
  baseRewardWei: bigint,
  carriedRewardWei: bigint
): bigint {
  if (baseRewardWei < 0n || carriedRewardWei < 0n) {
    throw new Error("Reward values cannot be negative");
  }
  return baseRewardWei + carriedRewardWei;
}

/**
 * Calculates settlement for non-final cycles in auction mode.
 * Surplus from discounted payout is carried over into the next cycle.
 *
 * @param rewardPoolWei Total reward pool available for this cycle
 * @param winnerPayoutWei Payout amount accepted by the winning bidder
 * @returns Object with winner payout and carried surplus for the next cycle
 */
export function calculateNonFinalAuctionSettlement(
  rewardPoolWei: bigint,
  winnerPayoutWei: bigint
): {
  payoutWei: bigint;
  carriedRewardWei: bigint;
} {
  if (winnerPayoutWei < 0n) {
    throw new Error("Winner payout cannot be negative");
  }
  if (winnerPayoutWei > rewardPoolWei) {
    throw new Error("Winner payout cannot exceed reward pool");
  }

  const carriedRewardWei = rewardPoolWei - winnerPayoutWei;
  return {
    payoutWei: winnerPayoutWei,
    carriedRewardWei,
  };
}

/**
 * Calculates settlement for the final cycle of any pool.
 * Full accumulated reward pool is paid out, guaranteeing ZERO final surplus.
 *
 * @param baseRewardWei Final cycle's base contribution reward
 * @param carriedRewardWei All accumulated carryover from prior cycles
 * @returns Object with full final payout and strictly zero carried reward
 */
export function calculateFinalSettlement(
  baseRewardWei: bigint,
  carriedRewardWei: bigint
): {
  finalPayoutWei: bigint;
  carriedRewardWei: 0n;
} {
  if (baseRewardWei < 0n || carriedRewardWei < 0n) {
    throw new Error("Reward values cannot be negative");
  }

  const finalPayoutWei = baseRewardWei + carriedRewardWei;
  return {
    finalPayoutWei,
    carriedRewardWei: 0n,
  };
}
