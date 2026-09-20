import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { validateBid, selectWinningBid } from "@merit-circle/domain";

export async function submitBid(
  userId: string,
  auctionId: string,
  payoutAmountWei: string
) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      cycle: {
        include: {
          group: {
            include: {
              pool: true,
              members: true,
            },
          },
        },
      },
      bids: true,
    },
  });

  if (!auction) {
    throw new AppError("Auction not found", 404, "NOT_FOUND");
  }

  const isMember = auction.cycle.group.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  if (auction.cycle.group.pool.mode !== "AUCTION") {
    throw new AppError(
      "Bidding is only available for AUCTION pool mode",
      400,
      "INVALID_POOL_MODE"
    );
  }

  if (auction.cycle.isFinalCycle) {
    throw new AppError(
      "Cannot submit bid on final cycle",
      400,
      "FINAL_CYCLE"
    );
  }

  if (auction.status !== "OPEN") {
    throw new AppError("Auction is not open", 400, "AUCTION_NOT_OPEN");
  }

  const member = auction.cycle.group.members.find((m) => m.userId === userId);
  if (member?.hasReceivedPayout) {
    throw new AppError(
      "User has already received a payout in this group",
      400,
      "ALREADY_RECEIVED_PAYOUT"
    );
  }

  const contribution = await prisma.contribution.findUnique({
    where: {
      cycleId_userId: {
        cycleId: auction.cycleId,
        userId,
      },
    },
  });

  const hasPaid =
    contribution &&
    (contribution.status === "PAID_ON_TIME" ||
      contribution.status === "PAID_LATE");

  if (!hasPaid) {
    throw new AppError(
      "User has not paid current cycle contribution",
      400,
      "CONTRIBUTION_NOT_PAID"
    );
  }

  const existingBid = (auction.bids || []).find((b) => b.userId === userId);
  if (existingBid) {
    throw new AppError(
      "User already submitted a bid for this auction",
      400,
      "DUPLICATE_BID"
    );
  }

  const candidatePayoutBigInt = BigInt(payoutAmountWei);
  const rewardPoolBigInt = BigInt(auction.rewardPoolWei);

  const validation = validateBid({
    payoutAmountWei: candidatePayoutBigInt,
    rewardPoolWei: rewardPoolBigInt,
    maxDiscountBps: auction.maxDiscountBps,
  });

  if (!validation.valid) {
    throw new AppError(
      validation.reason || "Invalid bid amount",
      400,
      "INVALID_BID"
    );
  }

  const bid = await prisma.bid.create({
    data: {
      auctionId: auction.id,
      userId,
      payoutAmountWei,
      status: "VALID",
      submittedAt: new Date(),
    },
  });

  // Check if best bid should be updated
  const allBids = [...(auction.bids || []), bid];
  const validDomainBids = allBids
    .filter((b) => b.status === "VALID")
    .map((b) => ({
      bidId: b.id,
      userId: b.userId,
      payoutAmountWei: BigInt(b.payoutAmountWei),
      submittedAt: new Date(b.submittedAt).getTime(),
    }));

  const winning = selectWinningBid(validDomainBids);
  if (winning && winning.bidId === bid.id) {
    await prisma.auction.update({
      where: { id: auction.id },
      data: { bestBidId: bid.id },
    });
  }

  return {
    bidId: bid.id,
    auctionId: bid.auctionId,
    userId: bid.userId,
    payoutAmountWei: bid.payoutAmountWei,
    status: bid.status,
  };
}

export async function getAuctionBids(userId: string, auctionId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      cycle: {
        include: {
          group: {
            include: {
              members: true,
            },
          },
        },
      },
      bids: {
        orderBy: { submittedAt: "asc" },
      },
    },
  });

  if (!auction) {
    throw new AppError("Auction not found", 404, "NOT_FOUND");
  }

  const isMember = auction.cycle.group.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  return {
    bids: (auction.bids || []).map((b) => ({
      bidId: b.id,
      userId: b.userId,
      payoutAmountWei: b.payoutAmountWei,
      status: b.status,
      submittedAt: b.submittedAt,
    })),
  };
}

export async function getAuctionResult(userId: string, auctionId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      cycle: {
        include: {
          group: {
            include: {
              members: true,
            },
          },
          payout: true,
          rewardLedger: true,
        },
      },
      bids: true,
    },
  });

  if (!auction) {
    throw new AppError("Auction not found", 404, "NOT_FOUND");
  }

  const isMember = auction.cycle.group.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  if (auction.status !== "SETTLED" && auction.status !== "NO_VALID_BID") {
    return {
      status: auction.status,
      settled: false,
    };
  }

  if (auction.status === "SETTLED") {
    const winningBid = (auction.bids || []).find(
      (b) => b.status === "WINNING" || b.id === auction.bestBidId
    );

    return {
      status: "SETTLED" as const,
      settled: true,
      winnerUserId: winningBid?.userId ?? auction.cycle.payout?.recipientUserId,
      winningBidWei:
        winningBid?.payoutAmountWei ?? auction.cycle.payout?.amountWei,
      rewardPoolWei:
        auction.cycle.rewardLedger?.rewardPoolWei ?? auction.rewardPoolWei,
      carriedRewardWei:
        auction.cycle.rewardLedger?.remainingCarryRewardWei ?? "0",
      payoutId: auction.cycle.payout?.id,
    };
  }

  // NO_VALID_BID fallback
  return {
    status: "NO_VALID_BID" as const,
    settled: true,
    fallbackRecipientUserId: auction.cycle.payout?.recipientUserId,
    payoutWei: auction.cycle.payout?.amountWei ?? auction.rewardPoolWei,
    carriedRewardWei: "0",
  };
}
