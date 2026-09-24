import { calculateLatePenalty } from "@merit-circle/domain";
import {
  ReputationEventType,
  ContractTransactionType,
  ContractTransactionStatus,
} from "@prisma/client";
import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { applyReputationEvent } from "../reputation/reputation.service";
import { logger } from "../../utils/logger";
import { settleCycle } from "../settlements/settlement.service";
import { paymentVerifier } from "./payment-verifier";
import { ConfirmPaymentInput } from "./payment.schema";

async function applyContributionReputation(params: {
  userId: string;
  contributionId: string;
  status: "PAID_ON_TIME" | "PAID_LATE";
  lateDays: number;
  penaltyPoint: number;
  isEarlyBonus: boolean;
}) {
  if (params.status === "PAID_ON_TIME") {
    await applyReputationEvent({
      userId: params.userId,
      type: ReputationEventType.CONTRIBUTION_ON_TIME,
      points: 50,
      reason: "On-time contribution payment",
      referenceType: "CONTRIBUTION",
      referenceId: params.contributionId,
    });

    if (params.isEarlyBonus) {
      await applyReputationEvent({
        userId: params.userId,
        type: ReputationEventType.CONTRIBUTION_EARLY_BONUS,
        points: 10,
        reason: "Early contribution payment bonus (before day 3)",
        referenceType: "CONTRIBUTION",
        referenceId: params.contributionId,
      });
    }
    return;
  }

  await applyReputationEvent({
    userId: params.userId,
    type: ReputationEventType.CONTRIBUTION_LATE,
    points: -params.penaltyPoint,
    reason: `Late contribution payment (${params.lateDays} days late)`,
    referenceType: "CONTRIBUTION",
    referenceId: params.contributionId,
  });
}

export async function createPaymentIntent(
  userId: string,
  target: string | { cycleId?: string; contributionId?: string }
) {
  let targetCycleId: string | undefined;
  let targetContributionId: string | undefined;

  if (typeof target === "string") {
    const maybeContrib = await prisma.contribution.findUnique({
      where: { id: target },
    });
    if (maybeContrib) {
      targetContributionId = maybeContrib.id;
      targetCycleId = maybeContrib.cycleId;
    } else {
      targetCycleId = target;
    }
  } else if (target) {
    if (target.contributionId) {
      const maybeContrib = await prisma.contribution.findUnique({
        where: { id: target.contributionId },
      });
      if (maybeContrib) {
        targetContributionId = maybeContrib.id;
        targetCycleId = maybeContrib.cycleId;
      }
    }
    if (!targetCycleId && target.cycleId) {
      targetCycleId = target.cycleId;
    }
  }

  if (!targetCycleId) {
    throw new AppError("Invalid cycle or contribution identifier", 400, "BAD_REQUEST");
  }

  // 1. Fetch cycle and group
  const cycle = await prisma.cycle.findUnique({
    where: { id: targetCycleId },
    include: {
      group: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!cycle) {
    throw new AppError("Cycle not found", 404, "NOT_FOUND");
  }

  // 2. Check group membership
  const isMember = cycle.group.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  if (
    cycle.status !== "PAYMENT_OPEN" ||
    cycle.group.status !== "ACTIVE" ||
    cycle.cycleNumber !== cycle.group.currentCycle
  ) {
    throw new AppError(
      "Cycle is not currently payable on-chain",
      400,
      "CYCLE_NOT_PAYABLE"
    );
  }

  // 4. Find contribution
  const contribution = targetContributionId
    ? await prisma.contribution.findUnique({ where: { id: targetContributionId } })
    : await prisma.contribution.findFirst({
        where: {
          cycleId: targetCycleId,
          userId,
        },
      });

  if (!contribution) {
    throw new AppError("Contribution not found for user", 404, "NOT_FOUND");
  }
  if (
    contribution.cycleId !== cycle.id ||
    contribution.groupId !== cycle.groupId ||
    contribution.userId !== userId
  ) {
    throw new AppError(
      "Contribution does not match the requested cycle",
      400,
      "CONTRIBUTION_CYCLE_MISMATCH"
    );
  }

  if (contribution.status !== "PENDING") {
    throw new AppError(
      contribution.status === "PAID_ON_TIME" || contribution.status === "PAID_LATE"
        ? "Contribution is already paid"
        : "Contribution is not pending payment",
      400,
      contribution.status === "PAID_ON_TIME" || contribution.status === "PAID_LATE"
        ? "CONTRIBUTION_ALREADY_PAID"
        : "CONTRIBUTION_NOT_PAYABLE"
    );
  }

  const contractGroupId = cycle.group.contractGroupId;
  if (!contractGroupId || !/^[1-9]\d*$/.test(contractGroupId)) {
    throw new AppError(
      "Group does not have a valid on-chain identifier",
      400,
      "CONTRACT_GROUP_ID_MISSING"
    );
  }

  const payload = {
    id: contribution.id,
    cycleId: cycle.id,
    groupId: cycle.groupId,
    contractGroupId,
    cycleNumber: cycle.cycleNumber,
    contributionId: contribution.id,
    contributionAmountWei: contribution.amountWei,
    paymentMethod: "BNB_TESTNET",
    contractAddress:
      process.env.CONTRACT_ADDRESS || "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C",
    instructions: "Call payContribution(groupId, cycleNumber) with exact value.",
  };

  return {
    ...payload,
    intent: payload,
  };
}

export async function confirmPayment(
  userId: string,
  input: ConfirmPaymentInput,
  paymentTimestamp?: Date
) {
  // 1. Find contribution
  const targetContributionId = input.contributionId || input.paymentIntentId;
  const contribution = await prisma.contribution.findFirst({
    where: targetContributionId
      ? { id: targetContributionId }
      : { cycleId: input.cycleId, userId },
    include: {
      cycle: true,
      group: {
        include: {
          pool: true,
        },
      },
    },
  });

  if (!contribution) {
    throw new AppError("Contribution not found", 404, "NOT_FOUND");
  }

  if (contribution.userId !== userId) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  if (input.cycleId && input.cycleId !== contribution.cycleId) {
    throw new AppError(
      "Cycle does not match the contribution",
      400,
      "CONTRIBUTION_CYCLE_MISMATCH"
    );
  }

  const txHash = input.txHash.toLowerCase();

  const contributionIsPaid =
    contribution.status === "PAID_ON_TIME" ||
    contribution.status === "PAID_LATE";
  const isIdempotentReplay =
    contributionIsPaid && contribution.txHash?.toLowerCase() === txHash;

  if (contributionIsPaid && !isIdempotentReplay) {
    throw new AppError(
      "Contribution is already paid",
      400,
      "CONTRIBUTION_ALREADY_PAID"
    );
  }

  if (contribution.cycle.groupId !== contribution.groupId) {
    throw new AppError(
      "Contribution cycle and group do not match",
      400,
      "CONTRIBUTION_CYCLE_MISMATCH"
    );
  }

  // Check if txHash has already been used by another contribution
  const existingContributionWithTx = await prisma.contribution.findFirst({
    where: {
      txHash,
      NOT: { id: contribution.id },
    },
  });

  if (existingContributionWithTx) {
    throw new AppError(
      "Transaction hash already used for another contribution",
      400,
      "TX_HASH_DUPLICATE"
    );
  }

  // Also check ContractTransaction table for duplicate txHash
  const existingContractTx = await prisma.contractTransaction.findUnique({
    where: { txHash },
  });

  if (existingContractTx && existingContractTx.cycleId !== contribution.cycleId) {
    throw new AppError(
      "Transaction hash already used for another contribution",
      400,
      "TX_HASH_DUPLICATE"
    );
  }

  // 3. Fetch user wallet
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const expectedGroupId = contribution.group.contractGroupId;
  if (!expectedGroupId || !/^[1-9]\d*$/.test(expectedGroupId)) {
    throw new AppError(
      "Group does not have a valid on-chain identifier",
      400,
      "CONTRACT_GROUP_ID_MISSING"
    );
  }

  // 4. Verify payment with PaymentVerifier
  const verification = await paymentVerifier.verifyContribution({
    txHash,
    expectedPayerWallet: user.walletAddress,
    expectedAmountWei: contribution.amountWei,
    expectedGroupId,
    expectedCycleNumber: contribution.cycle.cycleNumber,
  });

  if (!verification.success) {
    throw new AppError(
      verification.reason || "Payment verification failed",
      400,
      verification.code || "PAYMENT_VERIFICATION_FAILED"
    );
  }

  if (isIdempotentReplay) {
    const replayPaidAt = contribution.paidAt || new Date();
    const replayCycleStart =
      contribution.cycle.startDate || contribution.dueDate || replayPaidAt;
    await applyContributionReputation({
      userId,
      contributionId: contribution.id,
      status: contribution.status as "PAID_ON_TIME" | "PAID_LATE",
      lateDays: contribution.lateDays,
      penaltyPoint: contribution.penaltyPoint,
      isEarlyBonus:
        replayPaidAt.getTime() <
        replayCycleStart.getTime() + 3 * 24 * 60 * 60 * 1000,
    });
    const existing = {
      contributionId: contribution.id,
      status: contribution.status,
      lateDays: contribution.lateDays,
      penaltyPoint: contribution.penaltyPoint,
      rewardPoint: contribution.status === "PAID_ON_TIME" ? 50 : 0,
    };
    return {
      ...existing,
      contribution: existing,
      payment: {
        txHash,
        status: contribution.status,
      },
    };
  }

  // 5. Payment timing & penalty calculation
  const paymentTime =
    paymentTimestamp || verification.paymentTimestamp || new Date();
  const dueDate =
    contribution.dueDate || contribution.cycle.paymentDeadline;
  if (!dueDate) {
    throw new AppError(
      "Contribution has no payment deadline",
      400,
      "CONTRIBUTION_DEADLINE_MISSING"
    );
  }

  const isLate = paymentTime.getTime() > dueDate.getTime();

  let finalStatus: "PAID_ON_TIME" | "PAID_LATE" = "PAID_ON_TIME";
  let lateDays = 0;
  let penaltyPoint = 0;
  let rewardPoint = 0;
  let isEarlyBonus = false;

  if (isLate) {
    finalStatus = "PAID_LATE";
    const diffMs = paymentTime.getTime() - dueDate.getTime();
    lateDays = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    penaltyPoint = calculateLatePenalty(lateDays);
    rewardPoint = 0;
  } else {
    finalStatus = "PAID_ON_TIME";
    lateDays = 0;
    penaltyPoint = 0;
    rewardPoint = 50;

    // Early bonus check: paid before day 3 of cycle
    const cycleStart = contribution.cycle.startDate || dueDate;
    const earlyBonusThreshold =
      cycleStart.getTime() + 3 * 24 * 60 * 60 * 1000;
    if (paymentTime.getTime() < earlyBonusThreshold) {
      isEarlyBonus = true;
    }
  }

  // 6. Transactional database updates
  await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.contribution.updateMany({
      where: {
        id: contribution.id,
        status: "PENDING",
        txHash: null,
      },
      data: {
        status: finalStatus,
        paidAt: paymentTime,
        txHash,
        lateDays,
        penaltyPoint,
      },
    });
    if (claimed.count !== 1) {
      throw new AppError(
        "Contribution was already updated by another payment attempt",
        409,
        "CONTRIBUTION_STATE_CONFLICT"
      );
    }

    await transaction.contractTransaction.create({
      data: {
        type: ContractTransactionType.CONTRIBUTION_PAYMENT,
        status: ContractTransactionStatus.CONFIRMED,
        txHash,
        groupId: contribution.groupId,
        cycleId: contribution.cycleId,
        amountWei: contribution.amountWei,
        fromAddress: verification.from || user.walletAddress,
        toAddress: verification.to,
        blockNumber: verification.blockNumber,
      },
    });
  });

  await applyContributionReputation({
    userId,
    contributionId: contribution.id,
    status: finalStatus,
    lateDays,
    penaltyPoint,
    isEarlyBonus,
  });

  const res = {
    contributionId: contribution.id,
    status: finalStatus,
    lateDays,
    penaltyPoint,
    rewardPoint,
  };

  // 8. Auto-settlement: If all members in this cycle have now paid, automatically settle the cycle!
  try {
    const pendingContributionsCount = await prisma.contribution.count({
      where: {
        cycleId: contribution.cycleId,
        status: "PENDING",
      },
    });

    if (pendingContributionsCount === 0) {
      logger.info(
        `[AutoSettlement] All contributions paid for cycle ${contribution.cycleId}. Triggering auto-settlement...`
      );
      const adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });
      settleCycle(adminUser ? adminUser.id : userId, contribution.cycleId).catch(
        (settleErr: any) => {
          logger.error(
            `[AutoSettlement] Error executing automatic settlement for cycle ${contribution.cycleId}:`,
            settleErr
          );
        }
      );
    }
  } catch (err) {
    logger.error("[AutoSettlement] Check failed:", err);
  }

  return {
    ...res,
    contribution: res,
    payment: {
      txHash,
      status: finalStatus,
    },
  };
}

