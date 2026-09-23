import { prisma } from "../../db/client";

export async function getUserContributions(userId: string) {
  const contributions = await prisma.contribution.findMany({
    where: { userId },
    include: {
      cycle: true,
      group: {
        include: {
          pool: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    contributions: contributions.map((c) => ({
      id: c.id,
      groupId: c.groupId,
      contractGroupId: c.group.contractGroupId || String(c.group.groupNumber),
      groupNumber: c.group.groupNumber,
      groupCurrentCycle: c.group.currentCycle,
      poolName: c.group.pool.name,
      cycleId: c.cycleId,
      cycleNumber: c.cycle.cycleNumber,
      amountWei: c.amountWei,
      status: c.status,
      dueDate: c.dueDate,
      paidAt: c.paidAt,
      txHash: c.txHash,
      lateDays: c.lateDays,
      penaltyPoint: c.penaltyPoint,
    })),
  };
}
