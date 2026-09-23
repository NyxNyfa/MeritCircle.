import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { generateOtp, hashToken } from "../../utils/crypto";
import { emailProvider } from "./email.provider";
import { applyReputationEvent } from "../reputation/reputation.service";
import { ReputationEventType } from "@prisma/client";
import { logger } from "../../utils/logger";

// In-memory rate limiter for verification requests (userId => timestamps[])
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS_PER_HOUR = Number(process.env.EMAIL_OTP_MAX_REQUESTS_PER_HOUR || 5);
const OTP_EXPIRES_MINUTES = Number(process.env.EMAIL_OTP_EXPIRES_MINUTES || 10);

export function resetEmailRateLimits(): void {
  rateLimitMap.clear();
}

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const timestamps = (rateLimitMap.get(userId) || []).filter(
    (time) => now - time < windowMs
  );

  if (timestamps.length >= MAX_REQUESTS_PER_HOUR) {
    throw new AppError(
      "Too many verification requests. Please try again later.",
      429,
      "RATE_LIMITED"
    );
  }

  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
}

export async function requestEmailVerification(
  userId: string,
  emailFromBody?: string
): Promise<{
  success: boolean;
  expiresInMinutes: number;
  devCode?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  let profile = user.profile;

  const targetEmail =
    emailFromBody?.trim().toLowerCase() || profile?.email?.trim().toLowerCase();

  if (!targetEmail) {
    throw new AppError("Email is not set in user profile", 400, "EMAIL_NOT_SET");
  }

  // If email was explicitly provided in request body, validate uniqueness and update profile
  if (emailFromBody) {
    const existing = await prisma.profile.findFirst({
      where: {
        email: targetEmail,
        NOT: { userId },
      },
    });

    if (existing) {
      throw new AppError("Email is already registered by another user", 409, "EMAIL_ALREADY_EXISTS");
    }

    try {
      if (!profile) {
        profile = await prisma.profile.create({
          data: { userId, email: targetEmail },
        });
      } else if (profile.email !== targetEmail) {
        profile = await prisma.profile.update({
          where: { userId },
          data: { email: targetEmail, emailVerifiedAt: null },
        });
      }
    } catch (profileErr: any) {
      if (profileErr?.code === "P2002") {
        throw new AppError("Email is already registered by another user", 409, "EMAIL_ALREADY_EXISTS");
      }
      throw profileErr;
    }
  }

  checkRateLimit(userId);

  const code = generateOtp(6);
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  // Store hashed verification in EmailVerification table
  try {
    await prisma.emailVerification.create({
      data: {
        userId,
        email: targetEmail,
        tokenHash: codeHash,
        otpHash: codeHash,
        expiresAt,
      },
    });
  } catch (dbErr: any) {
    logger.error("[Email] Failed to persist email verification record:", dbErr?.message || dbErr);
    if (dbErr?.code === "P2021") {
      throw new AppError(
        "Database table EmailVerification does not exist. Please run database migrations.",
        500,
        "DATABASE_SCHEMA_ERROR"
      );
    }
    throw dbErr;
  }

  const sendResult = await emailProvider.sendVerificationEmail({
    to: targetEmail,
    code,
    expiresAt,
  });

  return {
    success: true,
    expiresInMinutes: OTP_EXPIRES_MINUTES,
    ...(process.env.NODE_ENV !== "production" ||
    process.env.EMAIL_PROVIDER === "console" ||
    sendResult?.fallbackUsed
      ? { devCode: code }
      : {}),
    ...(sendResult?.fallbackUsed
      ? { deliveryNotice: "Email delivery service in sandbox mode. OTP code is provided directly." }
      : {}),
  };
}

export async function confirmEmailVerification(
  userId: string,
  code: string
): Promise<{ success: boolean; emailVerified: boolean }> {
  const codeHash = hashToken(code.trim());

  // Find active verification record matching hash
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId,
      otpHash: codeHash,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    throw new AppError("Invalid verification code", 400, "INVALID_CODE");
  }

  if (verification.usedAt !== null) {
    throw new AppError("Verification code has already been used", 400, "CODE_ALREADY_USED");
  }

  if (verification.expiresAt < new Date()) {
    throw new AppError("Verification code has expired", 400, "CODE_EXPIRED");
  }

  // Mark verification as used and update user profile
  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    }),
    prisma.profile.update({
      where: { userId },
      data: { email: verification.email, emailVerifiedAt: new Date() },
    }),
  ]);

  // Award EMAIL_VERIFIED reputation event (+40 points, once)
  await applyReputationEvent({
    userId,
    type: ReputationEventType.EMAIL_VERIFIED,
    points: 40,
    reason: "Email successfully verified",
  });

  return {
    success: true,
    emailVerified: true,
  };
}
