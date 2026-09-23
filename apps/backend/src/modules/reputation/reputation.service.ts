import { ReputationEventType } from "@prisma/client";
import { prisma } from "../../db/client";
import { clampReputationPoints, getTierFromPoints, TIERS } from "@merit-circle/domain";

const ONE_TIME_EVENTS: Set<ReputationEventType> = new Set([
  ReputationEventType.WALLET_CONNECTED,
  ReputationEventType.USERNAME_SET,
  ReputationEventType.EMAIL_VERIFIED,
  ReputationEventType.SOCIAL_X_ADDED,
  ReputationEventType.SOCIAL_TELEGRAM_ADDED,
  ReputationEventType.SOCIAL_DISCORD_ADDED,
  ReputationEventType.AVATAR_UPLOADED,
  ReputationEventType.PROFILE_COMPLETED,
]);

export interface ApplyReputationEventParams {
  userId: string;
  type: ReputationEventType;
  points: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
}

export async function applyReputationEvent(
  params: ApplyReputationEventParams
): Promise<{ points: number; tier: number; eventAwarded: boolean }> {
  const { userId, type, points, reason, referenceType, referenceId } = params;

  // Prevent duplicate one-time events
  if (ONE_TIME_EVENTS.has(type)) {
    const existing = await prisma.reputationEvent.findFirst({
      where: { userId, type },
    });
    if (existing) {
      const rep = await prisma.reputation.findUnique({ where: { userId } });
      return {
        points: rep?.points ?? 0,
        tier: rep?.tier ?? 1,
        eventAwarded: false,
      };
    }
  }

  // Prevent duplicate events for the same entity reference (e.g. contribution)
  if (referenceType && referenceId) {
    const existingRef = await prisma.reputationEvent.findFirst({
      where: { userId, type, referenceType, referenceId },
    });
    if (existingRef) {
      const rep = await prisma.reputation.findUnique({ where: { userId } });
      return {
        points: rep?.points ?? 0,
        tier: rep?.tier ?? 1,
        eventAwarded: false,
      };
    }
  }

  // Get current reputation points
  const currentRep = await prisma.reputation.findUnique({
    where: { userId },
  });
  const currentPoints = currentRep?.points ?? 0;

  // Calculate new points clamped between 0 and 1000
  const newPoints = clampReputationPoints(currentPoints + points);
  const tierInfo = getTierFromPoints(newPoints);

  // Write event and update reputation
  await prisma.$transaction([
    prisma.reputationEvent.create({
      data: {
        userId,
        type,
        points,
        reason,
        referenceType,
        referenceId,
      },
    }),
    prisma.reputation.upsert({
      where: { userId },
      update: {
        points: newPoints,
        tier: tierInfo.tier,
      },
      create: {
        userId,
        points: newPoints,
        tier: tierInfo.tier,
      },
    }),
  ]);

  return {
    points: newPoints,
    tier: tierInfo.tier,
    eventAwarded: true,
  };
}

export async function getReputation(userId: string) {
  // Single source of truth: the reputation table, kept accurate by every applyReputationEvent
  const rep = await prisma.reputation.findUnique({ where: { userId } });
  const points = rep?.points ?? 0;

  const tierInfo = getTierFromPoints(points);

  let nextTierPoints: number | null = null;
  if (tierInfo.tier < 5) {
    const nextTier = (tierInfo.tier + 1) as 2 | 3 | 4 | 5;
    nextTierPoints = TIERS[nextTier].minPoint;
  }

  return {
    points,
    tier: tierInfo.tier,
    tierName: tierInfo.name,
    maxActiveGroups: tierInfo.maxActiveGroups,
    nextTierPoints,
  };
}

export async function getReputationHistory(userId: string) {
  const events = await prisma.reputationEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      points: true,
      reason: true,
      createdAt: true,
    },
  });

  return {
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      eventType: e.type,
      points: e.points,
      pointsDelta: e.points,
      reason: e.reason,
      createdAt: e.createdAt,
    })),
  };
}
