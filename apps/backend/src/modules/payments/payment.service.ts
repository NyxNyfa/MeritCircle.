import { calculateLatePenalty } from "@merit-circle/domain";
import {
  ReputationEventType,
  ContractTransactionType,
  ContractTransactionStatus,
} from "@prisma/client";
import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { applyReputationEvent } from "../reputation/reputation.service";
import { paymentVerifier } from "./payment-verifier";
import { ConfirmPaymentInput } from "./payment.schema";

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

  // 3. Cycle must not be COMPLETED or FAILED
  if (cycle.status === "COMPLETED" || cycle.status === "FAILED") {
    throw new AppError("Cycle is not payable", 400, "CYCLE_NOT_PAYABLE");
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

  if (contribution.status === "PAID_ON_TIME" || contribution.status === "PAID_LATE") {
    throw new AppError(
      "Contribution is already paid",
      400,
      "CONTRIBUTION_ALREADY_PAID"
    );
  }

  const payload = {
    id: contribution.id,
    cycleId: cycle.id,
    groupId: cycle.groupId,
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

  // 2. Idempotency checks
  // Same txHash already confirmed on this contribution -> return existing result
  if (
    contribution.txHash === input.txHash &&
    (contribution.status === "PAID_ON_TIME" || contribution.status === "PAID_LATE")
  ) {
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
        txHash: input.txHash,
        status: contribution.status,
      },
    };
  }

  // Contribution already paid with different txHash
  if (contribution.status === "PAID_ON_TIME" || contribution.status === "PAID_LATE") {
    throw new AppError(
      "Contribution is already paid",
      400,
      "CONTRIBUTION_ALREADY_PAID"
    );
  }

  // Check if txHash has already been used by another contribution
  const existingContributionWithTx = await prisma.contribution.findFirst({
    where: {
      txHash: input.txHash,
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
    where: { txHash: input.txHash },
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

  // 4. Verify payment with PaymentVerifier
  const verification = await paymentVerifier.verifyContribution({
    txHash: input.txHash,
    expectedPayerWallet: user.walletAddress,
    expectedAmountWei: contribution.amountWei,
  });

  if (!verification.success) {
    throw new AppError(
      verification.reason || "Payment verification failed",
      400,
      "PAYMENT_VERIFICATION_FAILED"
    );
  }

  // 5. Payment timing & penalty calculation
  const paymentTime = paymentTimestamp || new Date();
  const dueDate =
    contribution.dueDate ||
    contribution.cycle.paymentDeadline ||
    paymentTime;

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
  await prisma.$transaction([
    prisma.contribution.update({
      where: { id: contribution.id },
      data: {
        status: finalStatus,
        paidAt: paymentTime,
        txHash: input.txHash,
        lateDays,
        penaltyPoint,
      },
    }),
    prisma.contractTransaction.create({
      data: {
        type: ContractTransactionType.CONTRIBUTION_PAYMENT,
        status: ContractTransactionStatus.CONFIRMED,
        txHash: input.txHash,
        groupId: contribution.groupId,
        cycleId: contribution.cycleId,
        amountWei: contribution.amountWei,
        fromAddress: user.walletAddress,
      },
    }),
  ]);

  // 7. Reputation awards
  if (finalStatus === "PAID_ON_TIME") {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.CONTRIBUTION_ON_TIME,
      points: 50,
      reason: "On-time contribution payment",
      referenceType: "CONTRIBUTION",
      referenceId: contribution.id,
    });

    if (isEarlyBonus) {
      await applyReputationEvent({
        userId,
        type: ReputationEventType.CONTRIBUTION_EARLY_BONUS,
        points: 10,
        reason: "Early contribution payment bonus (before day 3)",
        referenceType: "CONTRIBUTION",
        referenceId: contribution.id,
      });
    }
  } else {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.CONTRIBUTION_LATE,
      points: -penaltyPoint,
      reason: `Late contribution payment (${lateDays} days late)`,
      referenceType: "CONTRIBUTION",
      referenceId: contribution.id,
    });
  }

  const res = {
    contributionId: contribution.id,
    status: finalStatus,
    lateDays,
    penaltyPoint,
    rewardPoint,
  };

  return {
    ...res,
    contribution: res,
    payment: {
      txHash: input.txHash,
      status: finalStatus,
    },
  };
}

