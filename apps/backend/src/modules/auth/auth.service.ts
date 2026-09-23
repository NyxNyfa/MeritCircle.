import { verifyMessage } from "viem";
import { ReputationEventType } from "@prisma/client";
import { prisma } from "../../db/client";
import { AppError } from "../../middleware/error";
import { generateNonce } from "../../utils/crypto";
import { signJwt } from "../../utils/jwt";
import { applyReputationEvent } from "../reputation/reputation.service";
import { logger } from "../../utils/logger";
import { ADMIN_WALLETS } from "../../middleware/auth";

interface StoredNonce {
  nonce: string;
  expiresAt: Date;
}

// In-memory nonce store (normalized lowercase walletAddress -> StoredNonce)
const nonceStore = new Map<string, StoredNonce>();
const NONCE_EXPIRES_MS = 5 * 60 * 1000; // 5 minutes

export function createNonce(walletAddress: string): {
  walletAddress: string;
  nonce: string;
  expiresAt: string;
} {
  const normalized = walletAddress.toLowerCase();
  const nonce = `Sign this message to authenticate with Merit Circle: ${generateNonce(16)}`;
  const expiresAt = new Date(Date.now() + NONCE_EXPIRES_MS);

  nonceStore.set(normalized, { nonce, expiresAt });
  logger.info(`Generated auth nonce for wallet: ${normalized}`);

  return {
    walletAddress,
    nonce,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifySignature(params: {
  walletAddress: string;
  nonce: string;
  signature: string;
}): Promise<{
  token: string;
  user: {
    id: string;
    walletAddress: string;
    role: string;
  };
}> {
  const { walletAddress, nonce, signature } = params;
  const normalized = walletAddress.toLowerCase();

  const stored = nonceStore.get(normalized);
  if (!stored || stored.nonce !== nonce) {
    throw new AppError("Invalid or expired nonce", 400);
  }

  if (stored.expiresAt < new Date()) {
    nonceStore.delete(normalized);
    throw new AppError("Nonce has expired", 400);
  }

  // Single-use: delete nonce immediately
  nonceStore.delete(normalized);

  // Verify EVM signature using viem
  let isValid = false;
  try {
    isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: nonce,
      signature: signature as `0x${string}`,
    });
  } catch (err) {
    logger.warn(`Signature verification failed for ${normalized}:`, err);
    throw new AppError("Invalid wallet signature", 401);
  }

  if (!isValid) {
    throw new AppError("Invalid wallet signature", 401);
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { walletAddress: normalized },
    include: { profile: true, reputation: true },
  });

  const isNewUser = !user;
  const isAdminWallet = ADMIN_WALLETS.includes(normalized);

  if (!user) {
    user = await prisma.user.create({
      data: {
        walletAddress: normalized,
        role: isAdminWallet ? "ADMIN" : "USER",
        profile: {
          create: {},
        },
        reputation: {
          create: {
            points: 0,
            tier: 1,
          },
        },
      },
      include: { profile: true, reputation: true },
    });

    // Award WALLET_CONNECTED (+10) for first-time login
    await applyReputationEvent({
      userId: user.id,
      type: ReputationEventType.WALLET_CONNECTED,
      points: 10,
      reason: "Wallet connected to Merit Circle",
    });

    logger.info(`New user created for wallet: ${normalized}`);
  } else if (isAdminWallet && user.role !== "ADMIN") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
      include: { profile: true, reputation: true },
    });
  }

  const effectiveRole = isAdminWallet ? "ADMIN" : user.role;

  const token = signJwt({
    sub: user.id,
    walletAddress: user.walletAddress,
    role: effectiveRole,
  });

  return {
    token,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      role: effectiveRole,
    },
  };
}

export async function getSession(userId: string): Promise<{
  user: {
    id: string;
    walletAddress: string;
    role: string;
  };
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      walletAddress: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new AppError("User not found or inactive", 401);
  }

  const isWalletAdmin = ADMIN_WALLETS.includes(user.walletAddress.toLowerCase());
  const effectiveRole = isWalletAdmin ? "ADMIN" : user.role;

  if (isWalletAdmin && user.role !== "ADMIN") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
  }

  return {
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      role: effectiveRole,
    },
  };
}
