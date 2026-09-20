import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";

export async function getCycleDetail(userId: string, cycleId: string) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
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

  const isMember = cycle.group.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  const contribution = await prisma.contribution.findFirst({
    where: {
      cycleId,
      userId,
    },
  });

  return {
    cycleId: cycle.id,
    groupId: cycle.groupId,
    cycleNumber: cycle.cycleNumber,
    startDate: cycle.startDate,
    paymentDeadline: cycle.paymentDeadline,
    auctionOpenAt: cycle.auctionOpenAt,
    auctionCloseAt: cycle.auctionCloseAt,
    settlementAt: cycle.settlementAt,
    isFinalCycle: cycle.isFinalCycle,
    status: cycle.status,
    myContribution: contribution
      ? {
          id: contribution.id,
          amountWei: contribution.amountWei,
          status: contribution.status,
          dueDate: contribution.dueDate,
          paidAt: contribution.paidAt,
          txHash: contribution.txHash,
          lateDays: contribution.lateDays,
          penaltyPoint: contribution.penaltyPoint,
        }
      : null,
  };
}
