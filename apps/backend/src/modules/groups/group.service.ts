import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";

export async function getUserGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          pool: true,
          members: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return {
    groups: memberships.map((m) => ({
      id: m.group.id,
      poolId: m.group.poolId,
      poolName: m.group.pool.name,
      poolMode: m.group.pool.mode,
      groupNumber: m.group.groupNumber,
      status: m.group.status,
      memberCount: m.group.memberCount,
      groupSize: m.group.pool.groupSize,
      currentCycle: m.group.currentCycle,
      startDate: m.group.startDate,
      mySlot: m.payoutSlot,
    })),
  };
}

export async function getGroupDetail(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      pool: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              profile: {
                select: {
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { payoutSlot: "asc" },
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

  return {
    id: group.id,
    poolId: group.poolId,
    groupNumber: group.groupNumber,
    status: group.status,
    memberCount: group.memberCount,
    groupSize: group.pool.groupSize,
    startDate: group.startDate,
    currentCycle: group.currentCycle,
    pool: {
      name: group.pool.name,
      mode: group.pool.mode,
      contributionAmountWei: group.pool.contributionAmountWei,
      cycleDurationDays: group.pool.cycleDurationDays,
      paymentWindowDays: group.pool.paymentWindowDays,
    },
    members: group.members.map((m) => ({
      userId: m.userId,
      walletAddress: m.user.walletAddress,
      username: m.user.profile?.username ?? null,
      avatarUrl: m.user.profile?.avatarUrl ?? null,
      payoutSlot: m.payoutSlot,
      hasReceivedPayout: m.hasReceivedPayout,
      status: m.status,
    })),
  };
}

export async function getGroupCycles(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
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

  const cycles = await prisma.cycle.findMany({
    where: { groupId },
    orderBy: { cycleNumber: "asc" },
  });

  return {
    groupId,
    cycles: cycles.map((c) => ({
      id: c.id,
      cycleNumber: c.cycleNumber,
      startDate: c.startDate,
      paymentDeadline: c.paymentDeadline,
      auctionOpenAt: c.auctionOpenAt,
      auctionCloseAt: c.auctionCloseAt,
      settlementAt: c.settlementAt,
      isFinalCycle: c.isFinalCycle,
      status: c.status,
    })),
  };
}
