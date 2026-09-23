import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import {
  calculateBaseReward,
  calculateRewardPool,
  calculateNonFinalAuctionSettlement,
  calculateFinalSettlement,
  selectWinningBid,
  clampReputationPoints,
  getTierFromPoints,
} from "@merit-circle/domain";
import {
  SettlementProvider,
  defaultSettlementProvider,
} from "./settlement.provider";

export async function settleCycle(
  adminUserId: string,
  cycleId: string,
  options?: { recipientUserId?: string },
  provider: SettlementProvider = defaultSettlementProvider
) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      group: {
        include: {
          pool: true,
          members: {
            include: {
              user: {
                include: {
                  reputation: true,
                  profile: true,
                },
              },
            },
          },
          cycles: {
            include: {
              rewardLedger: true,
            },
          },
        },
      },
      contributions: true,
      auction: {
        include: {
          bids: true,
        },
      },
      payout: true,
      rewardLedger: true,
    },
  });

  if (!cycle) {
    throw new AppError("Cycle not found", 404, "NOT_FOUND");
  }

  // 1. Verify cycle is current cycle
  if (cycle.cycleNumber !== cycle.group.currentCycle) {
    throw new AppError(
      "Cycle is not the current active cycle for this group",
      400,
      "CYCLE_NOT_CURRENT"
    );
  }

  // 2. Protected from duplicate settlement
  if (cycle.status === "COMPLETED" || cycle.payout) {
    throw new AppError(
      "Cycle is already settled",
      400,
      "CYCLE_ALREADY_SETTLED"
    );
  }

  // 3. Verify all contributions are paid
  const members = cycle.group.members;
  const contributions = cycle.contributions || [];

  const allContributionsPaid =
    contributions.length === members.length &&
    contributions.every(
      (c) => c.status === "PAID_ON_TIME" || c.status === "PAID_LATE"
    );

  if (!allContributionsPaid) {
    throw new AppError(
      "Not all members have paid their contributions for this cycle",
      400,
      "CONTRIBUTIONS_NOT_PAID"
    );
  }

  // 4. If AUCTION non-final, verify auction is CLOSED
  const isAuctionPool = cycle.group.pool.mode === "AUCTION";
  if (isAuctionPool && !cycle.isFinalCycle) {
    if (!cycle.auction || cycle.auction.status !== "CLOSED") {
      throw new AppError(
        "Auction must be CLOSED before settlement",
        400,
        "AUCTION_NOT_CLOSED"
      );
    }
  }

  // 5. Calculate base reward and carried reward
  const pool = cycle.group.pool;
  const baseReward = calculateBaseReward(
    pool.groupSize,
    BigInt(pool.contributionAmountWei)
  );

  let carriedReward = 0n;
  if (cycle.cycleNumber > 1) {
    const prevLedger = cycle.group.cycles.find(
      (c) => c.cycleNumber === cycle.cycleNumber - 1
    )?.rewardLedger;
    if (prevLedger) {
      carriedReward = BigInt(prevLedger.remainingCarryRewardWei);
    }
  }

  const rewardPool = calculateRewardPool(baseReward, carriedReward);

  // 6. Determine recipient, payout amount, remaining carry, and payout type
  let recipientUserId = options?.recipientUserId;
  let payoutWei = 0n;
  let remainingCarryRewardWei = 0n;
  let payoutType: "BASIC_CYCLE" | "AUCTION_CYCLE" | "FINAL_CYCLE" =
    "BASIC_CYCLE";
  let hasWinner = false;
  let winningBidId: string | null = null;

  // Function to get default eligible recipient ordered by reputation desc, joinedAt asc
  const getDefaultRecipient = () => {
    const eligibleMembers = members.filter((m) => !m.hasReceivedPayout);
    if (eligibleMembers.length === 0) {
      throw new AppError(
        "No eligible members remaining for payout",
        400,
        "NO_ELIGIBLE_RECIPIENT"
      );
    }
    eligibleMembers.sort((a, b) => {
      const repA = a.user.reputation?.points ?? 0;
      const repB = b.user.reputation?.points ?? 0;
      if (repB !== repA) return repB - repA;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
    return eligibleMembers[0].userId;
  };

  if (cycle.isFinalCycle) {
    // FINAL CYCLE: Always full payout, 0 carryover (NO FINAL SURPLUS)
    payoutType = "FINAL_CYCLE";
    const finalSettlement = calculateFinalSettlement(baseReward, carriedReward);
    payoutWei = finalSettlement.finalPayoutWei;
    remainingCarryRewardWei = 0n;

    if (!recipientUserId) {
      recipientUserId = getDefaultRecipient();
    }
  } else if (isAuctionPool) {
    // NON-FINAL AUCTION
    payoutType = "AUCTION_CYCLE";
    const auction = cycle.auction!;
    const validBids = (auction.bids || []).filter((b) => b.status === "VALID");

    const domainBids = validBids.map((b) => ({
      bidId: b.id,
      userId: b.userId,
      payoutAmountWei: BigInt(b.payoutAmountWei),
      submittedAt: new Date(b.submittedAt).getTime(),
    }));

    const winningDomainBid = selectWinningBid(domainBids);

    if (winningDomainBid) {
      hasWinner = true;
      winningBidId = winningDomainBid.bidId;
      recipientUserId = winningDomainBid.userId;
      const settlement = calculateNonFinalAuctionSettlement(
        rewardPool,
        winningDomainBid.payoutAmountWei
      );
      payoutWei = settlement.payoutWei;
      remainingCarryRewardWei = settlement.carriedRewardWei;
    } else {
      // Fallback: No valid bids submitted
      hasWinner = false;
      payoutWei = rewardPool;
      remainingCarryRewardWei = 0n;
      if (!recipientUserId) {
        recipientUserId = getDefaultRecipient();
      }
    }
  } else {
    // NON-FINAL BASIC
    payoutType = "BASIC_CYCLE";
    payoutWei = rewardPool;
    remainingCarryRewardWei = 0n;
    if (!recipientUserId) {
      recipientUserId = getDefaultRecipient();
    }
  }

  // Validate chosen recipient
  const recipientMember = members.find((m) => m.userId === recipientUserId);
  if (!recipientMember) {
    throw new AppError(
      "Recipient must be a member of the group",
      400,
      "INVALID_RECIPIENT"
    );
  }
  if (recipientMember.hasReceivedPayout) {
    throw new AppError(
      "Recipient has already received a payout in this group",
      400,
      "RECIPIENT_ALREADY_PAID"
    );
  }

  // 7. Call Settlement Provider
  const providerResult = await provider.settleCycle({
    groupId: cycle.groupId,
    contractGroupId: cycle.group.contractGroupId || undefined,
    cycleId: cycle.id,
    cycleNumber: cycle.cycleNumber,
    recipientUserId,
    recipientWalletAddress: recipientMember.user.walletAddress,
    amountWei: payoutWei.toString(),
    type: payoutType,
  });

  if (!providerResult.success || !providerResult.txHash) {
    throw new AppError(
      providerResult.reason || "Settlement provider execution failed on chain",
      500,
      "SETTLEMENT_PROVIDER_FAILED"
    );
  }

  const txHash = providerResult.txHash;

  // 8. DB Updates
  // Create Payout record
  const payout = await prisma.payout.create({
    data: {
      cycleId: cycle.id,
      groupId: cycle.groupId,
      recipientUserId,
      type: payoutType,
      amountWei: payoutWei.toString(),
      status: "SUCCESS",
      txHash,
      paidAt: new Date(),
    },
  });

  // Mark recipient hasReceivedPayout
  await prisma.groupMember.update({
    where: {
      groupId_userId: {
        groupId: cycle.groupId,
        userId: recipientUserId,
      },
    },
    data: {
      hasReceivedPayout: true,
      payoutSlot: cycle.cycleNumber,
    },
  });

  // Create CycleRewardLedger
  const rewardLedger = await prisma.cycleRewardLedger.create({
    data: {
      groupId: cycle.groupId,
      cycleId: cycle.id,
      cycleNumber: cycle.cycleNumber,
      baseRewardWei: baseReward.toString(),
      carriedRewardWei: carriedReward.toString(),
      rewardPoolWei: rewardPool.toString(),
      payoutWei: payoutWei.toString(),
      remainingCarryRewardWei: remainingCarryRewardWei.toString(),
      isFinalCycle: cycle.isFinalCycle,
    },
  });

  // Update Cycle status
  await prisma.cycle.update({
    where: { id: cycle.id },
    data: {
      status: "COMPLETED",
      settlementAt: new Date(),
    },
  });

  // Update Auction and bids if AUCTION mode non-final
  if (cycle.auction) {
    if (hasWinner && winningBidId) {
      await prisma.auction.update({
        where: { id: cycle.auction.id },
        data: {
          status: "SETTLED",
          settlementAt: new Date(),
          bestBidId: winningBidId,
        },
      });

      // Update bids status
      for (const bid of cycle.auction.bids) {
        await prisma.bid.update({
          where: { id: bid.id },
          data: {
            status: bid.id === winningBidId ? "WINNING" : "LOSE",
          },
        });
      }
    } else {
      await prisma.auction.update({
        where: { id: cycle.auction.id },
        data: {
          status: "NO_VALID_BID",
          settlementAt: new Date(),
        },
      });
    }
  }

  // Update Group
  if (cycle.isFinalCycle) {
    await prisma.group.update({
      where: { id: cycle.groupId },
      data: {
        currentCycle: cycle.cycleNumber + 1,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Apply GROUP_COMPLETED (+100) reputation event for members who completed all contributions
    for (const member of members) {
      const memberContributions = await prisma.contribution.findMany({
        where: {
          groupId: cycle.groupId,
          userId: member.userId,
        },
      });

      const allMemberPaid =
        memberContributions.length === pool.cycleCount &&
        memberContributions.every(
          (c) => c.status === "PAID_ON_TIME" || c.status === "PAID_LATE"
        );

      if (allMemberPaid) {
        // Prevent duplicate GROUP_COMPLETED
        const existingEvent = await prisma.reputationEvent.findFirst({
          where: {
            userId: member.userId,
            type: "GROUP_COMPLETED",
            referenceId: cycle.groupId,
          },
        });

        if (!existingEvent) {
          await prisma.reputationEvent.create({
            data: {
              userId: member.userId,
              type: "GROUP_COMPLETED",
              points: 100,
              reason: `Completed all contributions in group ${cycle.groupId}`,
              referenceType: "GROUP",
              referenceId: cycle.groupId,
            },
          });

          const rep = await prisma.reputation.findUnique({
            where: { userId: member.userId },
          });
          if (rep) {
            const newPoints = clampReputationPoints(rep.points + 100);
            const newTier = getTierFromPoints(newPoints).tier;
            await prisma.reputation.update({
              where: { userId: member.userId },
              data: {
                points: newPoints,
                tier: newTier,
              },
            });
          }
        }
      }
    }
  } else {
    await prisma.group.update({
      where: { id: cycle.groupId },
      data: {
        currentCycle: cycle.cycleNumber + 1,
      },
    });
  }

  // ContractTransaction record
  const txType = cycle.isFinalCycle
    ? "SETTLE_FINAL"
    : isAuctionPool
    ? "SETTLE_AUCTION"
    : "SETTLE_BASIC";

  await prisma.contractTransaction.create({
    data: {
      type: txType,
      txHash,
      status: "CONFIRMED",
      groupId: cycle.groupId,
      cycleId: cycle.id,
      amountWei: payoutWei.toString(),
    },
  });

  // AuditLog record
  const auditAction = cycle.isFinalCycle
    ? "SETTLE_FINAL"
    : isAuctionPool
    ? hasWinner
      ? "SETTLE_AUCTION"
      : "SETTLE_AUCTION_FALLBACK"
    : "SETTLE_BASIC";

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUserId,
      actorType: "ADMIN",
      action: auditAction,
      entityType: "SETTLEMENT",
      entityId: cycle.id,
      metadata: {
        groupId: cycle.groupId,
        cycleNumber: cycle.cycleNumber,
        recipientUserId,
        payoutWei: payoutWei.toString(),
        remainingCarryRewardWei: remainingCarryRewardWei.toString(),
        txHash,
      },
    },
  });

  return {
    success: true,
    payout: {
      id: payout.id,
      cycleId: cycle.id,
      recipientUserId,
      amountWei: payoutWei.toString(),
      type: payoutType,
      status: "SUCCESS" as const,
      txHash,
    },
    ledger: {
      cycleNumber: cycle.cycleNumber,
      baseRewardWei: baseReward.toString(),
      carriedRewardWei: carriedReward.toString(),
      rewardPoolWei: rewardPool.toString(),
      payoutWei: payoutWei.toString(),
      remainingCarryRewardWei: remainingCarryRewardWei.toString(),
      isFinalCycle: cycle.isFinalCycle,
    },
  };
}
