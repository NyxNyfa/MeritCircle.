import { ReputationEventType } from "@prisma/client";
import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { UpdateProfileInput } from "./profile.schema";
import { applyReputationEvent } from "../reputation/reputation.service";

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const profile = user.profile;

  return {
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
  };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
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

  // Check email uniqueness if changing
  if (input.email && input.email !== currentProfile.email) {
    const existing = await prisma.profile.findFirst({
      where: {
        email: input.email,
        NOT: { userId },
      },
    });
    if (existing) {
      throw new AppError("Email is already registered to another user", 409);
    }
  }

  // If email changes, emailVerifiedAt must be reset to null
  const isEmailChanged =
    input.email !== undefined &&
    input.email !== null &&
    input.email !== currentProfile.email;

  const emailVerifiedAtUpdate = isEmailChanged
    ? null
    : input.email === null
    ? null
    : undefined;

  // Award reputation events for first-time completions
  if (input.username && !currentProfile.username) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.USERNAME_SET,
      points: 10,
      reason: "Username set",
    });
  }

  if (input.xUrl && !currentProfile.xUrl) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.SOCIAL_X_ADDED,
      points: 5,
      reason: "X (Twitter) profile linked",
    });
  }

  if (input.telegramUrl && !currentProfile.telegramUrl) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.SOCIAL_TELEGRAM_ADDED,
      points: 5,
      reason: "Telegram account linked",
    });
  }

  if (input.discordHandle && !currentProfile.discordHandle) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.SOCIAL_DISCORD_ADDED,
      points: 5,
      reason: "Discord handle linked",
    });
  }

  if (input.avatarUrl && !currentProfile.avatarUrl) {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.AVATAR_UPLOADED,
      points: 15,
      reason: "Avatar uploaded",
    });
  }

  // Build update data
  const updateData: Record<string, any> = {};
  if (input.username !== undefined) updateData.username = input.username;
  if (input.email !== undefined) updateData.email = input.email;
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

  return {
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
  };
}
