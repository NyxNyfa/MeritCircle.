import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { calculateBaseReward } from "@merit-circle/domain";

export async function getGroupRewardLedger(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      pool: true,
      members: true,
      cycles: {
        orderBy: { cycleNumber: "asc" },
        include: {
          rewardLedger: true,
        },
      },
    },
  });

  if (!group) {
    throw new AppError("Group not found", 404, "NOT_FOUND");
  }

  const isMember = group.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  const baseRewardBigInt = calculateBaseReward(
    group.pool.groupSize,
    BigInt(group.pool.contributionAmountWei)
  );

  let runningCarry = 0n;
  const ledgerEntries: Array<{
    cycleNumber: number;
    baseRewardWei: string;
    carriedRewardWei: string;
    rewardPoolWei: string;
    payoutWei: string | null;
    remainingCarryRewardWei: string | null;
    isFinalCycle: boolean;
    status: "SETTLED" | "PROJECTED";
  }> = [];

  for (const cycle of group.cycles) {
    if (cycle.rewardLedger) {
      ledgerEntries.push({
        cycleNumber: cycle.cycleNumber,
        baseRewardWei: cycle.rewardLedger.baseRewardWei,
        carriedRewardWei: cycle.rewardLedger.carriedRewardWei,
        rewardPoolWei: cycle.rewardLedger.rewardPoolWei,
        payoutWei: cycle.rewardLedger.payoutWei,
        remainingCarryRewardWei: cycle.rewardLedger.remainingCarryRewardWei,
        isFinalCycle: cycle.rewardLedger.isFinalCycle,
        status: "SETTLED",
      });
      runningCarry = BigInt(cycle.rewardLedger.remainingCarryRewardWei);
    } else {
      const projectedRewardPool = baseRewardBigInt + runningCarry;
      ledgerEntries.push({
        cycleNumber: cycle.cycleNumber,
        baseRewardWei: baseRewardBigInt.toString(),
        carriedRewardWei: runningCarry.toString(),
        rewardPoolWei: projectedRewardPool.toString(),
        payoutWei: null,
        remainingCarryRewardWei: null,
        isFinalCycle: cycle.isFinalCycle,
        status: "PROJECTED",
      });
    }
  }

  return {
    groupId: group.id,
    groupSize: group.pool.groupSize,
    contributionAmountWei: group.pool.contributionAmountWei,
    ledger: ledgerEntries,
  };
}
