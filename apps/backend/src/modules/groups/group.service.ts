import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";

export async function getUserGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          pool: true,
          cycles: {
            orderBy: { cycleNumber: "asc" },
          },
          rewardLedgers: {
            orderBy: { cycleNumber: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const groups = memberships.map((m) => ({
    id: m.group.id,
    poolId: m.group.poolId,
    poolName: m.group.pool.name,
    poolMode: m.group.pool.mode,
    mode: m.group.pool.mode,
    groupNumber: m.group.groupNumber,
    status: m.group.status,
    memberStatus: m.status,
    isMemberReleased: m.status === "COMPLETED",
    isGroupCompleted: m.group.status === "COMPLETED",
    memberCount: m.group.memberCount,
    membersCount: m.group.memberCount,
    groupSize: m.group.pool.groupSize,
    maxMembers: m.group.pool.groupSize,
    currentCycle: m.group.currentCycle,
    currentCycleNumber: m.group.currentCycle,
    totalCycles: m.group.pool.cycleCount,
    startDate: m.group.startDate,
    completedAt: m.group.completedAt,
    nextPaymentDueDate:
      m.group.status === "COMPLETED"
        ? null
        : m.group.cycles?.find(
            (cycle) => cycle.cycleNumber === m.group.currentCycle
          )?.paymentDeadline,
    mySlot: m.payoutSlot,
    carriedRewardWei:
      m.group.rewardLedgers?.[0]?.remainingCarryRewardWei ?? "0",
  }));

  const activeGroups = groups.filter(
    (group) =>
      group.memberStatus === "ACTIVE" &&
      (group.status === "FORMING" || group.status === "ACTIVE")
  );

  const completedGroups = groups
    .filter(
      (group) =>
        group.memberStatus === "COMPLETED" || group.status === "COMPLETED"
    )
    .sort((left, right) => {
      const leftCompletedAt = left.completedAt
        ? new Date(left.completedAt).getTime()
        : 0;
      const rightCompletedAt = right.completedAt
        ? new Date(right.completedAt).getTime()
        : 0;
      return rightCompletedAt - leftCompletedAt;
    });

  return {
    groups,
    activeGroups,
    completedGroups,
  };
}

import { ADMIN_WALLETS } from "../../middleware/auth";

export async function getGroupDetail(
  userId: string,
  groupId: string,
  userRole?: string,
  userWallet?: string
) {
  let group = await prisma.group.findUnique({
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
    group = await prisma.group.findFirst({
      where: { contractGroupId: groupId },
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
  }

  if (!group) {
    throw new AppError("Group not found", 404, "NOT_FOUND");
  }

  const isMember = Array.isArray(group.members)
    ? group.members.some((m) => m.userId === userId)
    : true;
  const isAdmin =
    userRole === "ADMIN" ||
    ADMIN_WALLETS.includes((userWallet || "").toLowerCase());

  if (!isMember && !isAdmin) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  return {
    id: group.id,
    poolId: group.poolId,
    poolName: group.pool.name,
    mode: group.pool.mode,
    groupNumber: group.groupNumber,
    contractGroupId: group.contractGroupId || String(group.groupNumber),
    status: group.status,
    memberCount: group.memberCount,
    groupSize: group.pool.groupSize,
    maxMembers: group.pool.groupSize,
    startDate: group.startDate,
    currentCycle: group.currentCycle,
    currentCycleNumber: group.currentCycle,
    totalCycles: group.pool.cycleCount,
    pool: {
      name: group.pool.name,
      mode: group.pool.mode,
      contributionAmountWei: group.pool.contributionAmountWei,
      cycleDurationDays: group.pool.cycleDurationDays,
      paymentWindowDays: group.pool.paymentWindowDays,
    },
    members: (group.members || []).map((m: any) => ({
      userId: m.userId,
      walletAddress: m.user?.walletAddress,
      username: m.user?.profile?.username ?? null,
      avatarUrl: m.user?.profile?.avatarUrl ?? null,
      payoutSlot: m.payoutSlot,
      hasReceivedPayout: m.hasReceivedPayout,
      status: m.status,
    })),
  };
}

export async function getGroupCycles(
  userId: string,
  groupId: string,
  userRole?: string,
  userWallet?: string
) {
  let group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) {
    group = await prisma.group.findFirst({
      where: { contractGroupId: groupId },
      include: { members: true },
    });
  }

  if (!group) {
    throw new AppError("Group not found", 404, "NOT_FOUND");
  }

  const isMember = Array.isArray(group.members)
    ? group.members.some((m) => m.userId === userId)
    : true;
  const isAdmin =
    userRole === "ADMIN" ||
    ADMIN_WALLETS.includes((userWallet || "").toLowerCase());

  if (!isMember && !isAdmin) {
    throw new AppError(
      "You do not have access to this resource.",
      403,
      "FORBIDDEN"
    );
  }

  const cycles = await prisma.cycle.findMany({
    where: { groupId: group.id },
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
