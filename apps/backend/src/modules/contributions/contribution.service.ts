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
    orderBy: [
      { cycle: { cycleNumber: "asc" } },
      { createdAt: "desc" },
    ],
  });

  const mapped = contributions.map((c) => ({
    id: c.id,
    groupId: c.groupId,
    contractGroupId: c.group.contractGroupId || undefined,
    groupNumber: c.group.groupNumber,
    groupCurrentCycle: c.group.currentCycle,
    poolName: c.group.pool.name,
    poolMode: c.group.pool.mode,
    externalPoolId: c.group.pool.externalPoolId,
    cycleId: c.cycleId,
    cycleNumber: c.cycle.cycleNumber,
    cycleStatus: c.cycle.status,
    isPayable:
      c.status === "PENDING" &&
      c.group.status === "ACTIVE" &&
      c.cycle.status === "PAYMENT_OPEN" &&
      c.cycle.cycleNumber === c.group.currentCycle,
    amountWei: c.amountWei,
    status: c.status,
    dueDate: c.dueDate,
    paidAt: c.paidAt,
    txHash: c.txHash,
    lateDays: c.lateDays,
    penaltyPoint: c.penaltyPoint,
  }));

  // Sort payable active contributions first
  mapped.sort((a, b) => {
    // 1. Pending payable first
    if (a.isPayable && !b.isPayable) return -1;
    if (!a.isPayable && b.isPayable) return 1;

    // 2. Pending upcoming next, completed last
    const aIsPending = a.status === "PENDING";
    const bIsPending = b.status === "PENDING";
    if (aIsPending && !bIsPending) return -1;
    if (!aIsPending && bIsPending) return 1;

    // 3. By cycle number
    if (a.cycleNumber !== b.cycleNumber) return a.cycleNumber - b.cycleNumber;

    // 4. By due date
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return aTime - bTime;
  });

  return {
    contributions: mapped,
  };
}
