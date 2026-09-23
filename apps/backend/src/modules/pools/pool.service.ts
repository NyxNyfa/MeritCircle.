import { canJoinPool, getTierFromPoints } from "@merit-circle/domain";
import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { applyReputationEvent } from "../reputation/reputation.service";

export async function getPools() {
  const pools = await prisma.pool.findMany({
    where: { status: "ACTIVE" },
    orderBy: { minimumTier: "asc" },
  });

  return {
    pools: pools.map((p) => ({
      id: p.id,
      externalPoolId: p.externalPoolId,
      name: p.name,
      description: p.description,
      mode: p.mode,
      minimumTier: p.minimumTier,
      groupSize: p.groupSize,
      cycleCount: p.cycleCount,
      cycleDurationDays: p.cycleDurationDays,
      paymentWindowDays: p.paymentWindowDays,
      auctionOpenDay: p.auctionOpenDay,
      auctionCloseDay: p.auctionCloseDay,
      settlementDay: p.settlementDay,
      contributionAmountWei: p.contributionAmountWei,
      maxDiscountBps: p.maxDiscountBps,
      status: p.status,
      isActive: p.status === "ACTIVE",
      auctionWindowDays:
        p.auctionCloseDay && p.auctionOpenDay
          ? p.auctionCloseDay - p.auctionOpenDay + 1
          : 15,
    })),
  };
}

export async function getPoolById(poolId: string) {
  const pool = await prisma.pool.findFirst({
    where: {
      OR: [{ id: poolId }, { externalPoolId: poolId }],
    },
  });

  if (!pool) {
    throw new AppError("Pool not found", 404, "NOT_FOUND");
  }

  return {
    id: pool.id,
    externalPoolId: pool.externalPoolId,
    name: pool.name,
    description: pool.description,
    mode: pool.mode,
    minimumTier: pool.minimumTier,
    groupSize: pool.groupSize,
    cycleCount: pool.cycleCount,
    cycleDurationDays: pool.cycleDurationDays,
    paymentWindowDays: pool.paymentWindowDays,
    auctionOpenDay: pool.auctionOpenDay,
    auctionCloseDay: pool.auctionCloseDay,
    settlementDay: pool.settlementDay,
    contributionAmountWei: pool.contributionAmountWei,
    maxDiscountBps: pool.maxDiscountBps,
    status: pool.status,
    isActive: pool.status === "ACTIVE",
    auctionWindowDays:
      pool.auctionCloseDay && pool.auctionOpenDay
        ? pool.auctionCloseDay - pool.auctionOpenDay + 1
        : 15,
  };
}

export async function joinPool(userId: string, poolId: string) {
  // 1. Fetch Pool
  const pool = await prisma.pool.findFirst({
    where: {
      OR: [{ id: poolId }, { externalPoolId: poolId }],
    },
  });

  if (!pool) {
    throw new AppError("Pool not found", 404, "NOT_FOUND");
  }

  if (pool.status !== "ACTIVE") {
    throw new AppError("Pool is not currently active", 400, "POOL_INACTIVE");
  }

  // 2. Fetch User with profile and reputation
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, reputation: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new AppError("User account is inactive or banned", 403, "FORBIDDEN");
  }

  if (!user.profile?.username) {
    throw new AppError(
      "User must configure a username before joining a pool",
      400,
      "USERNAME_MISSING"
    );
  }

  if (!user.profile?.emailVerifiedAt) {
    throw new AppError(
      "User email address must be verified before joining a pool",
      400,
      "EMAIL_NOT_VERIFIED"
    );
  }

  // 3. Count user's active groups (FORMING or ACTIVE)
  const userMemberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: true },
  });

  const activeGroups = userMemberships.filter(
    (m) => m.group.status === "FORMING" || m.group.status === "ACTIVE"
  );
  const activeGroupCount = activeGroups.length;

  // 4. Validate with domain eligibility logic
  const repPoints = user.reputation?.points ?? 0;
  const userTier = getTierFromPoints(repPoints);

  if (userTier.tier < pool.minimumTier) {
    throw new AppError(
      `User reputation tier (${userTier.name}) is below minimum requirement (Tier ${pool.minimumTier})`,
      403,
      "TIER_INSUFFICIENT"
    );
  }

  if (activeGroupCount >= userTier.maxActiveGroups) {
    throw new AppError(
      `Active group limit reached (${userTier.maxActiveGroups}) for Tier ${userTier.tier}`,
      400,
      "ACTIVE_GROUP_LIMIT_REACHED"
    );
  }

  // Check if user is already in a FORMING or ACTIVE group in this same pool
  const alreadyInSamePool = activeGroups.some(
    (m) => m.group.poolId === pool.id
  );
  if (alreadyInSamePool) {
    throw new AppError(
      "User already has an active or forming group in this pool",
      400,
      "ALREADY_IN_POOL_GROUP"
    );
  }

  // 5. Group formation matching
  // Find earliest FORMING group in pool with available slot
  const formingGroups = await prisma.group.findMany({
    where: {
      poolId: pool.id,
      status: "FORMING",
    },
    orderBy: { createdAt: "asc" },
    include: { members: true },
  });

  const availableGroup = formingGroups.find(
    (g) => g.memberCount < pool.groupSize
  );

  if (!availableGroup) {
    // Determine next groupNumber for this pool
    const lastGroup = await prisma.group.findFirst({
      where: { poolId: pool.id },
      orderBy: { groupNumber: "desc" },
    });
    const nextGroupNumber = lastGroup ? lastGroup.groupNumber + 1 : 1;

    const willBecomeActive = pool.groupSize <= 1;

    // Create new group and add user as slot 1
    const newGroup = await prisma.group.create({
      data: {
        poolId: pool.id,
        groupNumber: nextGroupNumber,
        status: willBecomeActive ? "ACTIVE" : "FORMING",
        memberCount: 1,
        startDate: willBecomeActive ? new Date() : null,
        currentCycle: willBecomeActive ? 1 : 0,
        members: {
          create: {
            userId,
            payoutSlot: 1,
          },
        },
      },
    });

    if (willBecomeActive) {
      await createGroupCyclesAndContributions(newGroup.id, pool, [userId]);
    }

    // Award JOIN_POOL reputation event
    await applyReputationEvent({
      userId,
      type: "JOIN_POOL",
      points: 5,
      reason: `Joined pool: ${pool.name}`,
      referenceType: "pool",
      referenceId: pool.id,
    });

    return {
      groupId: newGroup.id,
      groupStatus: willBecomeActive ? "ACTIVE" : "FORMING",
      slot: 1,
      groupSize: pool.groupSize,
      groupWillBecomeActive: willBecomeActive,
    };
  } else {
    // Join existing group
    const newMemberCount = availableGroup.memberCount + 1;
    const willBecomeActive = newMemberCount >= pool.groupSize;
    const slot = newMemberCount;

    if (willBecomeActive) {
      const allMemberUserIds = [
        ...availableGroup.members.map((m) => m.userId),
        userId,
      ];
      const now = new Date();

      await prisma.$transaction([
        prisma.groupMember.create({
          data: {
            groupId: availableGroup.id,
            userId,
            payoutSlot: slot,
          },
        }),
        prisma.group.update({
          where: { id: availableGroup.id },
          data: {
            status: "ACTIVE",
            memberCount: newMemberCount,
            startDate: now,
            currentCycle: 1,
          },
        }),
      ]);

      await createGroupCyclesAndContributions(
        availableGroup.id,
        pool,
        allMemberUserIds,
        now
      );

      // Award JOIN_POOL reputation event
      await applyReputationEvent({
        userId,
        type: "JOIN_POOL",
        points: 5,
        reason: `Joined pool: ${pool.name}`,
        referenceType: "pool",
        referenceId: pool.id,
      });

      return {
        groupId: availableGroup.id,
        groupStatus: "ACTIVE",
        slot,
        groupSize: pool.groupSize,
        groupWillBecomeActive: true,
      };
    } else {
      await prisma.$transaction([
        prisma.groupMember.create({
          data: {
            groupId: availableGroup.id,
            userId,
            payoutSlot: slot,
          },
        }),
        prisma.group.update({
          where: { id: availableGroup.id },
          data: {
            memberCount: newMemberCount,
          },
        }),
      ]);

      // Award JOIN_POOL reputation event
      await applyReputationEvent({
        userId,
        type: "JOIN_POOL",
        points: 5,
        reason: `Joined pool: ${pool.name}`,
        referenceType: "pool",
        referenceId: pool.id,
      });

      return {
        groupId: availableGroup.id,
        groupStatus: "FORMING",
        slot,
        groupSize: pool.groupSize,
        groupWillBecomeActive: false,
      };
    }
  }
}

/**
 * Creates cycles and scheduled contributions for an activated group.
 */
export async function createGroupCyclesAndContributions(
  groupId: string,
  pool: any,
  memberUserIds: string[],
  startDate: Date = new Date()
) {
  const cycleCount = pool.cycleCount || pool.groupSize;
  const cycleDurationDays = pool.cycleDurationDays || 30;
  const paymentWindowDays = pool.paymentWindowDays || 10;
  const isAuction = pool.mode === "AUCTION";

  const cycleOps = [];
  const contributionOps = [];

  for (let c = 1; c <= cycleCount; c++) {
    const cycleStartMs =
      startDate.getTime() + (c - 1) * cycleDurationDays * 24 * 60 * 60 * 1000;
    const cycleStartDate = new Date(cycleStartMs);

    const deadlineMs =
      cycleStartMs + paymentWindowDays * 24 * 60 * 60 * 1000;
    const paymentDeadline = new Date(deadlineMs);

    const settlementMs =
      cycleStartMs + cycleDurationDays * 24 * 60 * 60 * 1000;
    const settlementAt = new Date(settlementMs);

    const isFinalCycle = c === cycleCount;
    const status = c === 1 ? "PAYMENT_OPEN" : "UPCOMING";

    let auctionOpenAt: Date | null = null;
    let auctionCloseAt: Date | null = null;
    if (isAuction) {
      const openDay = pool.auctionOpenDay ?? 11;
      const closeDay = pool.auctionCloseDay ?? 25;
      auctionOpenAt = new Date(
        cycleStartMs + openDay * 24 * 60 * 60 * 1000
      );
      auctionCloseAt = new Date(
        cycleStartMs + closeDay * 24 * 60 * 60 * 1000
      );
    }

    const createdCycle = await prisma.cycle.create({
      data: {
        groupId,
        cycleNumber: c,
        startDate: cycleStartDate,
        paymentDeadline,
        auctionOpenAt,
        auctionCloseAt,
        settlementAt,
        isFinalCycle,
        status,
      },
    });

    for (const memberId of memberUserIds) {
      await prisma.contribution.create({
        data: {
          cycleId: createdCycle.id,
          groupId,
          userId: memberId,
          amountWei: pool.contributionAmountWei,
          status: "PENDING",
          dueDate: paymentDeadline,
          lateDays: 0,
          penaltyPoint: 0,
        },
      });
    }
  }
}
