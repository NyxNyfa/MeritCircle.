import { Bid } from "./types";

/**
 * Calculates the minimum allowed payout for a bid based on maximum allowed discount in basis points (bps).
 * Formula: (rewardPoolWei * BigInt(10000 - maxDiscountBps)) / 10000n
 *
 * @param rewardPoolWei Total cycle reward pool in wei
 * @param maxDiscountBps Maximum discount in basis points (e.g. 1000 for 10%)
 * @returns Minimum allowed payout in wei
 */
export function calculateMinimumPayout(
  rewardPoolWei: bigint,
  maxDiscountBps: number
): bigint {
  if (rewardPoolWei < 0n) {
    throw new Error("Reward pool cannot be negative");
  }
  if (maxDiscountBps < 0 || maxDiscountBps > 10000) {
    throw new Error("maxDiscountBps must be between 0 and 10000");
  }

  const multiplier = BigInt(10000 - maxDiscountBps);
  return (rewardPoolWei * multiplier) / 10000n;
}

/**
 * Validates whether a candidate bid adheres to the cycle's auction constraints.
 *
 * @param params Object containing candidate payout amount, cycle reward pool, and max discount bps
 * @returns Result object with boolean valid flag and optional rejection reason
 */
export function validateBid(params: {
  payoutAmountWei: bigint;
  rewardPoolWei: bigint;
  maxDiscountBps: number;
}): {
  valid: boolean;
  reason?: string;
} {
  const { payoutAmountWei, rewardPoolWei, maxDiscountBps } = params;

  if (payoutAmountWei <= 0n) {
    return {
      valid: false,
      reason: "Payout amount must be greater than zero",
    };
  }

  if (payoutAmountWei > rewardPoolWei) {
    return {
      valid: false,
      reason: "Payout amount cannot exceed the reward pool",
    };
  }

  const minPayout = calculateMinimumPayout(rewardPoolWei, maxDiscountBps);
  if (payoutAmountWei < minPayout) {
    return {
      valid: false,
      reason: `Payout amount is below the minimum allowed payout (${minPayout.toString()} wei)`,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Selects the winning bid from a list of submitted bids.
 * Deterministic rules:
 * 1. Lowest payoutAmountWei wins.
 * 2. In case of a tie, earliest submittedAt timestamp wins.
 * 3. Returns null if bids array is empty.
 *
 * @param bids Array of submitted bids
 * @returns The winning Bid, or null if no bids exist
 */
export function selectWinningBid(bids: Bid[]): Bid | null {
  if (bids.length === 0) {
    return null;
  }

  let winner = bids[0];

  for (let i = 1; i < bids.length; i++) {
    const candidate = bids[i];
    if (candidate.payoutAmountWei < winner.payoutAmountWei) {
      winner = candidate;
    } else if (candidate.payoutAmountWei === winner.payoutAmountWei) {
      if (candidate.submittedAt < winner.submittedAt) {
        winner = candidate;
      }
    }
  }

  return winner;
}
