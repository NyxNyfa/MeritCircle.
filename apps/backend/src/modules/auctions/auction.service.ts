import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import {
  calculateBaseReward,
  calculateRewardPool,
  calculateMinimumPayout,
  selectWinningBid,
} from "@merit-circle/domain";

export async function getCycleAuction(userId: string, cycleId: string) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      group: {
        include: {
          pool: true,
          members: true,
        },
      },
      auction: {
        include: {
          bids: {
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });

  if (!cycle) {
    throw new AppError("Cycle not found", 404, "NOT_FOUND");
  }

  const isMember = cycle.group.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  const pool = cycle.group.pool;
  const baseReward = calculateBaseReward(
    pool.groupSize,
    BigInt(pool.contributionAmountWei)
  );

  // If BASIC pool
  if (pool.mode === "BASIC") {
    return {
      cycleId: cycle.id,
      mode: "BASIC" as const,
      auctionEnabled: false,
      isFinalCycle: cycle.isFinalCycle,
      rewardPoolWei: baseReward.toString(),
    };
  }

  // Get carried reward from previous cycle ledger if exists
  let carriedReward = 0n;
  if (cycle.cycleNumber > 1) {
    const prevLedger = await prisma.cycleRewardLedger.findFirst({
      where: {
        groupId: cycle.groupId,
        cycleNumber: cycle.cycleNumber - 1,
      },
    });
    if (prevLedger) {
      carriedReward = BigInt(prevLedger.remainingCarryRewardWei);
    }
  }

  const rewardPool = calculateRewardPool(baseReward, carriedReward);

  // If FINAL cycle
  if (cycle.isFinalCycle) {
    return {
      cycleId: cycle.id,
      mode: pool.mode,
      auctionEnabled: false,
      isFinalCycle: true,
      finalRewardPoolWei: rewardPool.toString(),
      message: "Final cycle pays full reward pool. No auction discount.",
    };
  }

  // Non-final AUCTION cycle
  const maxDiscountBps = pool.maxDiscountBps ?? 0;
  const minimumPayout = calculateMinimumPayout(rewardPool, maxDiscountBps);

  let auction = cycle.auction;
  if (!auction) {
    auction = await prisma.auction.create({
      data: {
        cycleId: cycle.id,
        groupId: cycle.groupId,
        status: "SCHEDULED",
        rewardPoolWei: rewardPool.toString(),
        minimumPayoutWei: minimumPayout.toString(),
        maxDiscountBps,
      },
      include: {
        bids: {
          orderBy: { submittedAt: "asc" },
        },
      },
    });
  }

  // Check user eligibility
  const member = cycle.group.members.find((m) => m.userId === userId);
  const alreadyReceivedPayout = member?.hasReceivedPayout ?? false;

  const contribution = await prisma.contribution.findUnique({
    where: {
      cycleId_userId: {
        cycleId: cycle.id,
        userId,
      },
    },
  });
  const hasPaid =
    contribution &&
    (contribution.status === "PAID_ON_TIME" ||
      contribution.status === "PAID_LATE");

  const myBidRecord = auction.bids?.find((b) => b.userId === userId);

  let eligible = true;
  let reason: string | null = null;

  if (auction.status !== "OPEN") {
    eligible = false;
    reason = "Auction is not open";
  } else if (alreadyReceivedPayout) {
    eligible = false;
    reason = "User has already received a payout in this group";
  } else if (!hasPaid) {
    eligible = false;
    reason = "User has not paid current cycle contribution";
  } else if (myBidRecord) {
    eligible = false;
    reason = "User already submitted a bid for this auction";
  }

  // Calculate best bid
  const validBids = (auction.bids || []).filter(
    (b) => b.status === "VALID" || b.status === "WINNING"
  );
  const domainBids = validBids.map((b) => ({
    bidId: b.id,
    userId: b.userId,
    payoutAmountWei: BigInt(b.payoutAmountWei),
    submittedAt: new Date(b.submittedAt).getTime(),
  }));
  const winningDomainBid = selectWinningBid(domainBids);

  const bestBid = winningDomainBid
    ? {
        bidId: winningDomainBid.bidId,
        userId: winningDomainBid.userId,
        payoutAmountWei: winningDomainBid.payoutAmountWei.toString(),
      }
    : null;

  const myBid = myBidRecord
    ? {
        bidId: myBidRecord.id,
        userId: myBidRecord.userId,
        payoutAmountWei: myBidRecord.payoutAmountWei,
        status: myBidRecord.status,
        submittedAt: myBidRecord.submittedAt,
      }
    : null;

  return {
    auctionId: auction.id,
    cycleId: cycle.id,
    status: auction.status,
    mode: "AUCTION" as const,
    isFinalCycle: false,
    rewardPoolWei: rewardPool.toString(),
    carriedRewardWei: carriedReward.toString(),
    baseRewardWei: baseReward.toString(),
    minimumPayoutWei: minimumPayout.toString(),
    maxDiscountBps,
    myEligibility: {
      eligible,
      reason,
    },
    myBid,
    bestBid,
  };
}

export async function openAuction(adminUserId: string, cycleId: string) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      group: {
        include: {
          pool: true,
        },
      },
      auction: true,
    },
  });

  if (!cycle) {
    throw new AppError("Cycle not found", 404, "NOT_FOUND");
  }

  if (cycle.group.pool.mode !== "AUCTION") {
    throw new AppError(
      "Auction is only available for AUCTION pool mode",
      400,
      "INVALID_POOL_MODE"
    );
  }

  if (cycle.isFinalCycle) {
    throw new AppError(
      "Cannot open auction for final cycle",
      400,
      "FINAL_CYCLE"
    );
  }

  if (cycle.group.status !== "ACTIVE") {
    throw new AppError("Group is not active", 400, "GROUP_NOT_ACTIVE");
  }

  if (
    cycle.auction &&
    (cycle.auction.status === "OPEN" ||
      cycle.auction.status === "CLOSED" ||
      cycle.auction.status === "SETTLED")
  ) {
    throw new AppError(
      "Auction is already open, closed, or settled",
      400,
      "AUCTION_ALREADY_PROCESSED"
    );
  }

  const pool = cycle.group.pool;
  const baseReward = calculateBaseReward(
    pool.groupSize,
    BigInt(pool.contributionAmountWei)
  );

  let carriedReward = 0n;
  if (cycle.cycleNumber > 1) {
    const prevLedger = await prisma.cycleRewardLedger.findFirst({
      where: {
        groupId: cycle.groupId,
        cycleNumber: cycle.cycleNumber - 1,
      },
    });
    if (prevLedger) {
      carriedReward = BigInt(prevLedger.remainingCarryRewardWei);
    }
  }

  const rewardPool = calculateRewardPool(baseReward, carriedReward);
  const maxDiscountBps = pool.maxDiscountBps ?? 0;
  const minimumPayout = calculateMinimumPayout(rewardPool, maxDiscountBps);

  const auction = cycle.auction
    ? await prisma.auction.update({
        where: { id: cycle.auction.id },
        data: {
          status: "OPEN",
          openAt: new Date(),
          rewardPoolWei: rewardPool.toString(),
          minimumPayoutWei: minimumPayout.toString(),
          maxDiscountBps,
        },
      })
    : await prisma.auction.create({
        data: {
          cycleId: cycle.id,
          groupId: cycle.groupId,
          status: "OPEN",
          openAt: new Date(),
          rewardPoolWei: rewardPool.toString(),
          minimumPayoutWei: minimumPayout.toString(),
          maxDiscountBps,
        },
      });

  await prisma.cycle.update({
    where: { id: cycle.id },
    data: {
      status: "AUCTION_OPEN",
      auctionOpenAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUserId,
      actorType: "ADMIN",
      action: "AUCTION_OPEN",
      entityType: "AUCTION",
      entityId: auction.id,
      metadata: { cycleId: cycle.id, groupId: cycle.groupId },
    },
  });

  return {
    success: true,
    auction,
  };
}

export async function closeAuction(adminUserId: string, cycleId: string) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      group: true,
      auction: true,
    },
  });

  if (!cycle) {
    throw new AppError("Cycle not found", 404, "NOT_FOUND");
  }

  if (!cycle.auction || cycle.auction.status !== "OPEN") {
    throw new AppError(
      "Auction must be OPEN to close",
      400,
      "AUCTION_NOT_OPEN"
    );
  }

  const updatedAuction = await prisma.auction.update({
    where: { id: cycle.auction.id },
    data: {
      status: "CLOSED",
      closeAt: new Date(),
    },
  });

  await prisma.cycle.update({
    where: { id: cycle.id },
    data: {
      status: "AUCTION_CLOSED",
      auctionCloseAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUserId,
      actorType: "ADMIN",
      action: "AUCTION_CLOSE",
      entityType: "AUCTION",
      entityId: updatedAuction.id,
      metadata: { cycleId: cycle.id, groupId: cycle.groupId },
    },
  });

  return {
    success: true,
    auction: updatedAuction,
  };
}
