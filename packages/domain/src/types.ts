export type PoolMode = "BASIC" | "AUCTION";

export type GroupStatus =
  | "FORMING"
  | "ACTIVE"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ContributionStatus =
  | "PENDING"
  | "PAID_ON_TIME"
  | "PAID_LATE"
  | "UNPAID";

export type CycleStatus =
  | "UPCOMING"
  | "PAYMENT_OPEN"
  | "PAYMENT_CLOSED"
  | "AUCTION_OPEN"
  | "AUCTION_CLOSED"
  | "SETTLING"
  | "COMPLETED"
  | "FAILED";

export interface TierInfo {
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  minPoint: number;
  maxPoint: number;
  maxActiveGroups: number;
}

export interface UserProfileSnapshot {
  hasUsername: boolean;
  emailVerified: boolean;
  reputationPoint: number;
  activeGroupCount: number;
}

export interface PoolSnapshot {
  mode: PoolMode;
  minimumTier: 1 | 2 | 3 | 4 | 5;
  groupSize: number;
  contributionAmountWei: bigint;
  maxDiscountBps?: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface Bid {
  bidId: string;
  userId: string;
  payoutAmountWei: bigint;
  submittedAt: number;
}
