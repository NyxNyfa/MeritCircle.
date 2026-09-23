import { ReputationEventType } from "@prisma/client";
import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { UpdateProfileInput } from "./profile.schema";
import { applyReputationEvent } from "../reputation/reputation.service";
import { clampReputationPoints, getTierFromPoints } from "@merit-circle/domain";

export async function getProfile(userId: string) {
  const [user, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, reputation: true },
    }),
    prisma.reputationEvent.findMany({
      where: { userId },
      select: { points: true },
    }),
  ]);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Reconcile reputation the same way as getReputation()
  let currentPoints = user.reputation?.points ?? 0;
  if (events.length > 0) {
    const computed = clampReputationPoints(
      events.reduce((sum: number, e: { points: number }) => sum + (e.points || 0), 0)
    );
    if (!user.reputation || user.reputation.points !== computed) {
      const tierInfo = getTierFromPoints(computed);
      await prisma.reputation.upsert({
        where: { userId },
        update: { points: computed, tier: tierInfo.tier },
        create: { userId, points: computed, tier: tierInfo.tier },
      });
    }
    currentPoints = computed;
  }
  const currentTier = getTierFromPoints(currentPoints).tier;

  const profile = user.profile;
  return {
    id: user.id,
    username: profile?.username ?? null,
    email: profile?.email ?? null,
    emailVerifiedAt: profile?.emailVerifiedAt
      ? profile.emailVerifiedAt.toISOString()
      : null,
    avatarUrl: profile?.avatarUrl ?? null,
    xUrl: profile?.xUrl ?? null,
    telegramUrl: profile?.telegramUrl ?? null,
    discordHandle: profile?.discordHandle ?? null,
    walletAddress: user.walletAddress,
    role: user.role,
    points: currentPoints,
    reputationPoints: currentPoints,
    tier: currentTier,
  };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, reputation: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  let currentProfile = user.profile;
  if (!currentProfile) {
    currentProfile = await prisma.profile.create({
      data: { userId },
    });
  }

  // Check username uniqueness if changing
  if (input.username && input.username !== currentProfile.username) {
    const existing = await prisma.profile.findFirst({
      where: {
        username: input.username,
        NOT: { userId },
      },
    });
    if (existing) {
      throw new AppError("Username is already taken", 409);
    }
  }

  const normalizedInputEmail =
    input.email !== undefined && input.email !== null
      ? input.email.trim().toLowerCase()
      : input.email;
  const currentEmail = currentProfile.email
    ? currentProfile.email.trim().toLowerCase()
    : currentProfile.email;

  // Check email uniqueness if changing
  if (normalizedInputEmail && normalizedInputEmail !== currentEmail) {
    const existing = await prisma.profile.findFirst({
      where: {
        email: normalizedInputEmail,
        NOT: { userId },
      },
    });
    if (existing) {
      throw new AppError("Email is already registered to another user", 409);
    }
  }

  // If email changes, emailVerifiedAt must be reset to null
  const isEmailChanged =
    normalizedInputEmail !== undefined &&
    normalizedInputEmail !== null &&
    normalizedInputEmail !== currentEmail;

  const emailVerifiedAtUpdate = isEmailChanged
    ? null
    : input.email === null
    ? null
    : undefined;

  // Award reputation events for first-time completions
  // Note: applyReputationEvent automatically ensures one-time events are only awarded once
  if (input.username && input.username.trim().length > 0) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.USERNAME_SET,
      points: 20,
      reason: "Username set",
    });
  }

  if (input.xUrl && input.xUrl.trim().length > 0) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.SOCIAL_X_ADDED,
      points: 10,
      reason: "X (Twitter) profile linked",
    });
  }

  if (input.telegramUrl && input.telegramUrl.trim().length > 0) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.SOCIAL_TELEGRAM_ADDED,
      points: 10,
      reason: "Telegram account linked",
    });
  }

  if (input.discordHandle && input.discordHandle.trim().length > 0) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.SOCIAL_DISCORD_ADDED,
      points: 10,
      reason: "Discord handle linked",
    });
  }

  if (input.avatarUrl && input.avatarUrl.trim().length > 0) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.AVATAR_UPLOADED,
      points: 10,
      reason: "Avatar uploaded",
    });
  }

  // Build update data
  const updateData: Record<string, any> = {};
  if (input.username !== undefined) updateData.username = input.username;
  if (input.email !== undefined) updateData.email = normalizedInputEmail;
  if (emailVerifiedAtUpdate !== undefined)
    updateData.emailVerifiedAt = emailVerifiedAtUpdate;
  if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
  if (input.xUrl !== undefined) updateData.xUrl = input.xUrl;
  if (input.telegramUrl !== undefined) updateData.telegramUrl = input.telegramUrl;
  if (input.discordHandle !== undefined)
    updateData.discordHandle = input.discordHandle;

  const updatedProfile = await prisma.profile.update({
    where: { userId },
    data: updateData,
  });

  // Fetch updated reputation after awards
  const updatedRep = await prisma.reputation.findUnique({
    where: { userId },
  });
  const currentPoints = updatedRep?.points ?? 0;
  const currentTier = updatedRep?.tier ?? 1;

  return {
    id: user.id,
    username: updatedProfile.username ?? null,
    email: updatedProfile.email ?? null,
    emailVerifiedAt: updatedProfile.emailVerifiedAt
      ? updatedProfile.emailVerifiedAt.toISOString()
      : null,
    avatarUrl: updatedProfile.avatarUrl ?? null,
    xUrl: updatedProfile.xUrl ?? null,
    telegramUrl: updatedProfile.telegramUrl ?? null,
    discordHandle: updatedProfile.discordHandle ?? null,
    walletAddress: user.walletAddress,
    role: user.role,
    points: currentPoints,
    reputationPoints: currentPoints,
    tier: currentTier,
  };
}
