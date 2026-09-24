import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { clampReputationPoints, getTierFromPoints } from "@merit-circle/domain";
import { createGroupCyclesAndContributions } from "../pools/pool.service";

/* =========================================================================
 * 1. ADMIN OVERVIEW METRICS
 * ========================================================================= */

export async function getOverview() {
  const totalUsers = await prisma.user.count();
  const totalPools = await prisma.pool.count();
  const formingGroups = await prisma.group.count({ where: { status: "FORMING" } });
  const activeGroups = await prisma.group.count({ where: { status: "ACTIVE" } });
  const completedGroups = await prisma.group.count({ where: { status: "COMPLETED" } });
  const paymentOpenCycles = await prisma.cycle.count({ where: { status: "PAYMENT_OPEN" } });
  const auctionOpenCycles = await prisma.cycle.count({ where: { status: "AUCTION_OPEN" } });
  const pendingContributions = await prisma.contribution.count({ where: { status: "PENDING" } });
  const paidContributions = await prisma.contribution.count({
    where: { status: { in: ["PAID_ON_TIME", "PAID_LATE"] } },
  });
  const lateContributions = await prisma.contribution.count({ where: { status: "PAID_LATE" } });
  const recentAuditLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return {
    totalUsers,
    totalPools,
    formingGroups,
    activeGroups,
    completedGroups,
    paymentOpenCycles,
    auctionOpenCycles,
    pendingContributions,
    paidContributions,
    lateContributions,
    recentAuditLogs,
  };
}

/* =========================================================================
 * 2. ADMIN USER MANAGEMENT & REPUTATION ADJUSTMENT
 * ========================================================================= */

export async function getUsers() {
  const users = await prisma.user.findMany({
    include: {
      profile: true,
      reputation: true,
      groupMembers: {
        where: {
          status: "ACTIVE",
          group: { status: { in: ["FORMING", "ACTIVE"] } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    users: users.map((u) => ({
      id: u.id,
      walletAddress: u.walletAddress,
      username: u.profile?.username ?? null,
      email: u.profile?.email ?? null,
      emailVerifiedAt: u.profile?.emailVerifiedAt ?? null,
      role: u.role,
      status: u.status,
      reputationPoint: u.reputation?.points ?? 0,
      reputationPoints: u.reputation?.points ?? 0,
      tier: u.reputation?.tier ?? 1,
      activeGroupsCount: u.groupMembers.length,
      createdAt: u.createdAt,
    })),
  };
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      reputation: true,
      groupMembers: {
        include: {
          group: {
            include: { pool: true },
          },
        },
      },
      reputationEvents: {
        take: 20,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const activeMemberships = user.groupMembers.filter(
    (m) => m.status === "ACTIVE" && (m.group.status === "FORMING" || m.group.status === "ACTIVE")
  );
  const completedMemberships = user.groupMembers.filter(
    (m) => m.status === "COMPLETED" || m.group.status === "COMPLETED"
  );

  return {
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.profile?.username ?? null,
      email: user.profile?.email ?? null,
      emailVerifiedAt: user.profile?.emailVerifiedAt ?? null,
      role: user.role,
      status: user.status,
      reputationPoint: user.reputation?.points ?? 0,
      reputationPoints: user.reputation?.points ?? 0,
      tier: user.reputation?.tier ?? 1,
      profile: user.profile,
      activeGroupsCount: activeMemberships.length,
      activeGroups: activeMemberships.map((m) => ({
        groupId: m.groupId,
        groupNumber: m.group.groupNumber,
        poolName: m.group.pool.name,
        status: m.group.status,
        memberStatus: m.status,
        currentCycle: m.group.currentCycle,
        slot: m.payoutSlot,
        hasReceivedPayout: m.hasReceivedPayout,
      })),
      completedGroups: completedMemberships.map((m) => ({
        groupId: m.groupId,
        groupNumber: m.group.groupNumber,
        poolName: m.group.pool.name,
        status: m.group.status,
        memberStatus: m.status,
        currentCycle: m.group.currentCycle,
        slot: m.payoutSlot,
        hasReceivedPayout: m.hasReceivedPayout,
      })),
      recentEvents: user.reputationEvents,
      createdAt: user.createdAt,
    },
  };
}

export async function adjustReputation(
  adminUserId: string,
  targetUserId: string,
  points: number,
  reason: string
) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { reputation: true },
  });

  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const currentPoints = user.reputation?.points ?? 0;
  const currentTier = user.reputation?.tier ?? 1;

  // Clamped between 0 and 1000
  const newPoints = clampReputationPoints(currentPoints + points);
  const newTier = getTierFromPoints(newPoints).tier;

  const [updatedReputation] = await prisma.$transaction([
    prisma.reputation.upsert({
      where: { userId: targetUserId },
      update: {
        points: newPoints,
        tier: newTier,
      },
      create: {
        userId: targetUserId,
        points: newPoints,
        tier: newTier,
      },
    }),
    prisma.reputationEvent.create({
      data: {
        userId: targetUserId,
        type: "ADMIN_ADJUSTMENT",
        points: points,
        reason: reason,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        actorType: "ADMIN",
        action: "ADJUST_REPUTATION",
        entityType: "USER",
        entityId: targetUserId,
        metadata: {
          previousPoints: currentPoints,
          newPoints,
          pointsDelta: points,
          previousTier: currentTier,
          newTier,
          reason,
        },
      },
    }),
  ]);

  return {
    userId: targetUserId,
    reputationPoints: updatedReputation.points,
    newPoints: updatedReputation.points,
    pointsAdded: points,
    pointsDelta: points,
    tier: updatedReputation.tier,
    reason,
  };
}

/* =========================================================================
 * 3. ADMIN POOL MANAGEMENT
 * ========================================================================= */

export async function getPools() {
  const pools = await prisma.pool.findMany({
    include: {
      groups: true,
    },
    orderBy: { createdAt: "desc" },
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
      cycleDurationDays: p.cycleDurationDays,
      paymentWindowDays: p.paymentWindowDays,
      auctionOpenDay: p.auctionOpenDay,
      auctionCloseDay: p.auctionCloseDay,
      settlementDay: p.settlementDay,
      contributionAmountWei: p.contributionAmountWei,
      maxDiscountBps: p.maxDiscountBps,
      status: p.status,
      groupsCount: p.groups.length,
      createdAt: p.createdAt,
    })),
  };
}

export async function createPool(adminUserId: string, data: any) {
  // Validate business rules
  if (data.mode === "AUCTION") {
    if (data.maxDiscountBps === null || data.maxDiscountBps === undefined) {
      throw new AppError("AUCTION pool must specify maxDiscountBps", 400, "BAD_REQUEST");
    }
    if (data.auctionOpenDay === null || data.auctionOpenDay === undefined) {
      throw new AppError("AUCTION pool must specify auctionOpenDay", 400, "BAD_REQUEST");
    }
    if (data.auctionCloseDay === null || data.auctionCloseDay === undefined) {
      throw new AppError("AUCTION pool must specify auctionCloseDay", 400, "BAD_REQUEST");
    }
  } else {
    data.maxDiscountBps = null;
    data.auctionOpenDay = null;
    data.auctionCloseDay = null;
  }

  const existing = await prisma.pool.findUnique({
    where: { externalPoolId: data.externalPoolId },
  });
  if (existing) {
    throw new AppError(`Pool with externalPoolId ${data.externalPoolId} already exists`, 409, "CONFLICT");
  }

  const pool = await prisma.pool.create({
    data: {
      externalPoolId: data.externalPoolId,
      name: data.name,
      description: data.description,
      mode: data.mode,
      minimumTier: data.minimumTier,
      groupSize: data.groupSize,
      cycleCount: data.groupSize,
      cycleDurationDays: data.cycleDurationDays,
      paymentWindowDays: data.paymentWindowDays,
      auctionOpenDay: data.auctionOpenDay,
      auctionCloseDay: data.auctionCloseDay,
      settlementDay: data.settlementDay,
      contributionAmountWei: data.contributionAmountWei,
      maxDiscountBps: data.maxDiscountBps,
      status: data.status || "ACTIVE",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUserId,
      actorType: "ADMIN",
      action: "CREATE_POOL",
      entityType: "POOL",
      entityId: pool.id,
      metadata: { externalPoolId: pool.externalPoolId, name: pool.name, mode: pool.mode },
    },
  });

  return { pool };
}

export async function patchPool(
  adminUserId: string,
  poolId: string,
  data: {
    name?: string;
    description?: string | null;
    minimumTier?: number;
    groupSize?: number;
    cycleDurationDays?: number;
    paymentWindowDays?: number;
    auctionOpenDay?: number | null;
    auctionCloseDay?: number | null;
    settlementDay?: number;
    contributionAmountWei?: string;
    maxDiscountBps?: number | null;
    status?: any;
  }
) {
  const existing = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { groups: true },
  });
  if (!existing) {
    throw new AppError("Pool not found", 404, "NOT_FOUND");
  }

  // Prevent changing groupSize if active groups already exist
  const activeGroups = (existing.groups || []).filter((g) => g.status === "ACTIVE");
  if (activeGroups.length > 0 && data.groupSize && data.groupSize !== existing.groupSize) {
    throw new AppError(
      "Tidak dapat mengubah ukuran kelompok (group size) pada pool yang telah memiliki kelompok aktif.",
      400,
      "POOL_HAS_ACTIVE_GROUPS"
    );
  }

  const updated = await prisma.pool.update({
    where: { id: poolId },
    data: {
      name: data.name ?? existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      minimumTier: data.minimumTier ?? existing.minimumTier,
      groupSize: data.groupSize ?? existing.groupSize,
      cycleCount: data.groupSize ?? existing.cycleCount,
      cycleDurationDays: data.cycleDurationDays ?? existing.cycleDurationDays,
      paymentWindowDays: data.paymentWindowDays ?? existing.paymentWindowDays,
      auctionOpenDay: data.auctionOpenDay !== undefined ? data.auctionOpenDay : existing.auctionOpenDay,
      auctionCloseDay: data.auctionCloseDay !== undefined ? data.auctionCloseDay : existing.auctionCloseDay,
      settlementDay: data.settlementDay ?? existing.settlementDay,
      contributionAmountWei: data.contributionAmountWei ?? existing.contributionAmountWei,
      maxDiscountBps: data.maxDiscountBps !== undefined ? data.maxDiscountBps : existing.maxDiscountBps,
      status: data.status ?? existing.status,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUserId,
      actorType: "ADMIN",
      action: "PATCH_POOL",
      entityType: "POOL",
      entityId: poolId,
      metadata: { previous: existing, updated },
    },
  });

  return { pool: updated };
}

export async function deletePool(adminUserId: string, poolId: string) {
  const existing = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      groups: {
        include: {
          contributions: true,
          cycles: true,
          members: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppError("Pool not found", 404, "NOT_FOUND");
  }

  const groups = existing.groups || [];

  // Check if any group has paid contributions or completed cycles
  const hasPaidOrCompleted = groups.some(
    (g: any) =>
      g.contributions?.some((c: any) => c.status === "PAID_ON_TIME" || c.status === "PAID_LATE") ||
      g.cycles?.some((c: any) => c.status === "COMPLETED")
  );

  if (hasPaidOrCompleted) {
    throw new AppError(
      "Tidak dapat menghapus pool yang memiliki riwayat transaksi setoran lunas atau siklus selesai. Anda dapat mengubah status pool menjadi PAUSED atau CLOSED.",
      400,
      "POOL_HAS_TRANSACTION_HISTORY"
    );
  }

  // If there are forming groups or groups with no paid contributions (like test cohorts), clean them up safely
  if (groups.length > 0) {
    const groupIds = groups.map((g) => g.id);
    await prisma.$transaction([
      prisma.contribution.deleteMany({ where: { groupId: { in: groupIds } } }),
      prisma.cycleRewardLedger.deleteMany({ where: { groupId: { in: groupIds } } }),
      prisma.bid.deleteMany({ where: { auction: { cycle: { groupId: { in: groupIds } } } } }),
      prisma.auction.deleteMany({ where: { cycle: { groupId: { in: groupIds } } } }),
      prisma.payout.deleteMany({ where: { cycle: { groupId: { in: groupIds } } } }),
      prisma.cycle.deleteMany({ where: { groupId: { in: groupIds } } }),
      prisma.groupMember.deleteMany({ where: { groupId: { in: groupIds } } }),
      prisma.group.deleteMany({ where: { id: { in: groupIds } } }),
      prisma.pool.delete({ where: { id: poolId } }),
    ]);
  } else {
    await prisma.pool.delete({ where: { id: poolId } });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUserId,
      actorType: "ADMIN",
      action: "DELETE_POOL",
      entityType: "POOL",
      entityId: poolId,
      metadata: { deletedPool: { externalPoolId: existing.externalPoolId, name: existing.name } },
    },
  });

  return { success: true, message: `Pool ${existing.name} (${existing.externalPoolId}) berhasil dihapus.` };
}

/* =========================================================================
 * 4. ADMIN GROUP OPERATIONS & FILL DEMO
 * ========================================================================= */

export async function getGroups() {
  const groups = await prisma.group.findMany({
    include: {
      pool: true,
      members: true,
      cycles: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    groups: groups.map((g) => ({
      id: g.id,
      poolId: g.poolId,
      poolName: g.pool?.name ?? "ROSCA Pool",
      poolMode: g.pool?.mode ?? "BASIC",
      groupNumber: g.groupNumber,
      status: g.status,
      memberCount: g.members.length,
      groupSize: g.pool?.groupSize ?? g.members.length,
      currentCycle: g.currentCycle,
      startDate: g.startDate,
      createdAt: g.createdAt,
      contractGroupId: g.contractGroupId,
      cyclesCount: g.cycles.length,
      pool: g.pool
        ? {
            id: g.pool.id,
            externalPoolId: g.pool.externalPoolId,
            name: g.pool.name,
            mode: g.pool.mode,
            groupSize: g.pool.groupSize,
            contributionAmountWei: g.pool.contributionAmountWei,
          }
        : {
            id: g.poolId,
            externalPoolId: "POOL-UNKNOWN",
            name: "ROSCA Pool",
            mode: "BASIC" as const,
            groupSize: g.members.length || 3,
            contributionAmountWei: "0",
          },
    })),
  };
}

export async function getGroup(groupId: string) {
  let group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      pool: true,
      members: {
        include: {
          user: {
            include: { profile: true, reputation: true },
          },
        },
        orderBy: { payoutSlot: "asc" },
      },
      cycles: {
        include: {
          contributions: true,
          auction: {
            include: { bids: true },
          },
          payout: true,
          rewardLedger: true,
        },
        orderBy: { cycleNumber: "asc" },
      },
      rewardLedgers: {
        orderBy: { cycleNumber: "asc" },
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
              include: { profile: true, reputation: true },
            },
          },
          orderBy: { payoutSlot: "asc" },
        },
        cycles: {
          include: {
            contributions: true,
            auction: {
              include: { bids: true },
            },
            payout: true,
            rewardLedger: true,
          },
          orderBy: { cycleNumber: "asc" },
        },
        rewardLedgers: {
          orderBy: { cycleNumber: "asc" },
        },
      },
    });
  }

  if (!group) {
    throw new AppError("Group not found", 404, "NOT_FOUND");
  }

  return { group };
}

export async function fillDemoGroup(adminUserId: string, groupId: string, prefix = "demo") {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      pool: true,
      members: true,
    },
  });

  if (!group) {
    throw new AppError("Group not found", 404, "NOT_FOUND");
  }

  if (group.status !== "FORMING") {
    throw new AppError(
      `Only FORMING groups can be filled with demo users. Current status is ${group.status}`,
      400,
      "BAD_REQUEST"
    );
  }

  const needed = group.pool.groupSize - group.members.length;
  if (needed <= 0) {
    throw new AppError("Group is already full", 400, "BAD_REQUEST");
  }

  const addedUserIds: string[] = [];

  // Create or retrieve demo users
  for (let i = 1; i <= needed; i++) {
    const slot = group.members.length + i;
    const demoUsername = `${prefix}_${group.pool.externalPoolId.toLowerCase()}_slot${slot}_${Date.now().toString(36).slice(-4)}`;
    const demoWallet = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`.toLowerCase();

    // Give demo user enough reputation points to satisfy pool minimum tier
    const demoTierPoints = group.pool.minimumTier >= 4 ? 900 : group.pool.minimumTier >= 2 ? 400 : 100;
    const demoTier = getTierFromPoints(demoTierPoints).tier;

    const demoUser = await prisma.user.create({
      data: {
        walletAddress: demoWallet,
        role: "USER",
        status: "ACTIVE",
        profile: {
          create: {
            username: demoUsername,
            email: `${demoUsername}@meritcircle.local`,
            emailVerifiedAt: new Date(),
          },
        },
        reputation: {
          create: {
            points: demoTierPoints,
            tier: demoTier,
          },
        },
      },
    });

    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: demoUser.id,
        payoutSlot: slot,
      },
    });

    addedUserIds.push(demoUser.id);
  }

  // Activate group now that it is full!
  const allMemberUserIds = [...group.members.map((m) => m.userId), ...addedUserIds];
  const now = new Date();

  await prisma.group.update({
    where: { id: group.id },
    data: {
      status: "ACTIVE",
      memberCount: group.pool.groupSize,
      startDate: now,
      currentCycle: 1,
    },
  });

  await createGroupCyclesAndContributions(group.id, group.pool, allMemberUserIds, now);

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUserId,
      actorType: "ADMIN",
      action: "FILL_DEMO_GROUP",
      entityType: "GROUP",
      entityId: group.id,
      metadata: {
        isDemo: true,
        isDemoTool: true,
        neededMembers: needed,
        newMemberCount: group.pool.groupSize,
        poolId: group.pool.id,
        status: "ACTIVE",
      },
    },
  });

  const updatedGroup = await prisma.group.findUnique({
    where: { id: group.id },
    include: {
      members: { include: { user: { include: { profile: true } } } },
      cycles: true,
    },
  });

  return {
    group: updatedGroup,
    demoMembersAdded: needed,
    addedMembersCount: needed,
    activated: true,
    status: "ACTIVE",
  };
}

/* =========================================================================
 * 5. ADMIN AUDIT LOGS
 * ========================================================================= */

export async function getAuditLogs(limit = 50, offset = 0) {
  const [total, auditLogs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    total,
    limit,
    offset,
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      actorUserId: log.actorUserId,
      actorType: log.actorType,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      createdAt: log.createdAt,
    })),
  };
}
