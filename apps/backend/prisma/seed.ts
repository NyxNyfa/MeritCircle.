/**
 * Merit Circle — Database Seed Script
 * Phase 06 — Database Schema
 *
 * Creates:
 * - 1 Admin user with verified profile
 * - 5 Demo users (one per tier) with profiles and reputation
 * - 12 Pool catalog entries (Basic + Auction)
 *
 * Idempotent: uses upsert to safely re-run without duplicates.
 */

import path from "path";
import dotenv from "dotenv";

// Load .env from backend directory or project root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.DATABASE_URL) {
  console.error("\n❌ [Seed Error]: Environment variable DATABASE_URL is not set.");
  console.error("Please configure DATABASE_URL in your .env file before seeding.");
  console.error("Example: DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/merit_circle?schema=public\"\n");
  process.exit(1);
}

import { PrismaClient, PoolMode, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Seed Data ───────────────────────────────────────────────────────────────

interface UserSeed {
  walletAddress: string;
  role: UserRole;
  username: string;
  email: string;
  emailVerified: boolean;
  reputationPoints: number;
  tier: number;
}

const ADMIN_USER: UserSeed = {
  walletAddress: "0xAdmin000000000000000000000000000000000001",
  role: "ADMIN",
  username: "admin",
  email: "admin@meritcircle.local",
  emailVerified: true,
  reputationPoints: 1000,
  tier: 5,
};

const DEMO_USERS: UserSeed[] = [
  {
    walletAddress: "0xDemo0000000000000000000000000000000000001",
    role: "USER",
    username: "demo_tier1",
    email: "demo1@meritcircle.local",
    emailVerified: true,
    reputationPoints: 100,
    tier: 1,
  },
  {
    walletAddress: "0xDemo0000000000000000000000000000000000002",
    role: "USER",
    username: "demo_tier2",
    email: "demo2@meritcircle.local",
    emailVerified: true,
    reputationPoints: 400,
    tier: 2,
  },
  {
    walletAddress: "0xDemo0000000000000000000000000000000000003",
    role: "USER",
    username: "demo_tier3",
    email: "demo3@meritcircle.local",
    emailVerified: true,
    reputationPoints: 700,
    tier: 3,
  },
  {
    walletAddress: "0xDemo0000000000000000000000000000000000004",
    role: "USER",
    username: "demo_tier4",
    email: "demo4@meritcircle.local",
    emailVerified: true,
    reputationPoints: 900,
    tier: 4,
  },
  {
    walletAddress: "0xDemo0000000000000000000000000000000000005",
    role: "USER",
    username: "demo_tier5",
    email: "demo5@meritcircle.local",
    emailVerified: true,
    reputationPoints: 1000,
    tier: 5,
  },
];

interface PoolSeed {
  externalPoolId: string;
  name: string;
  description?: string;
  mode: PoolMode;
  minimumTier: number;
  groupSize: number;
  contributionAmountWei: string;
  maxDiscountBps: number | null;
}

const POOL_CATALOG: PoolSeed[] = [
  {
    externalPoolId: "START-1",
    name: "Starter Circle (Newcomer)",
    description: "Kelompok arisan perdana untuk Newcomer (3 anggota) tanpa syarat minimal poin reputasi.",
    mode: "BASIC",
    minimumTier: 1,
    groupSize: 3,
    contributionAmountWei: "800000000000000", // 0.0008 tBNB (Termurah / Newcomer)
    maxDiscountBps: null,
  },
  {
    externalPoolId: "CIT-1",
    name: "Citizen Circle A",
    description: "Citizen circle dengan 3 anggota",
    mode: "BASIC",
    minimumTier: 2,
    groupSize: 3,
    contributionAmountWei: "1000000000000000", // 0.0010 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "CIT-2",
    name: "Citizen Circle B",
    description: "Citizen circle dengan 5 anggota",
    mode: "BASIC",
    minimumTier: 2,
    groupSize: 5,
    contributionAmountWei: "1500000000000000", // 0.0015 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "CIT-3",
    name: "Citizen Circle C",
    description: "Citizen circle dengan 7 anggota",
    mode: "BASIC",
    minimumTier: 2,
    groupSize: 7,
    contributionAmountWei: "2000000000000000", // 0.0020 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "BLD-1",
    name: "Builder Circle A",
    description: "Builder circle dengan 5 anggota",
    mode: "BASIC",
    minimumTier: 3,
    groupSize: 5,
    contributionAmountWei: "3000000000000000", // 0.0030 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "BLD-2",
    name: "Builder Circle B",
    description: "Builder circle dengan 7 anggota",
    mode: "BASIC",
    minimumTier: 3,
    groupSize: 7,
    contributionAmountWei: "4000000000000000", // 0.0040 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "BLD-3",
    name: "Builder Circle C",
    description: "Builder circle dengan 10 anggota",
    mode: "BASIC",
    minimumTier: 3,
    groupSize: 10,
    contributionAmountWei: "5000000000000000", // 0.0050 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "TRU-1",
    name: "Trusted Basic A",
    description: "Trusted basic circle dengan 5 anggota",
    mode: "BASIC",
    minimumTier: 4,
    groupSize: 5,
    contributionAmountWei: "8000000000000000", // 0.0080 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "TRU-A1",
    name: "Trusted Auction A",
    description: "Trusted auction circle dengan 5 anggota",
    mode: "AUCTION",
    minimumTier: 4,
    groupSize: 5,
    contributionAmountWei: "10000000000000000", // 0.0100 tBNB
    maxDiscountBps: 1000,
  },
  {
    externalPoolId: "TRU-A2",
    name: "Trusted Auction B",
    description: "Trusted auction circle dengan 7 anggota",
    mode: "AUCTION",
    minimumTier: 4,
    groupSize: 7,
    contributionAmountWei: "12000000000000000", // 0.0120 tBNB
    maxDiscountBps: 1200,
  },
  {
    externalPoolId: "PRM-A1",
    name: "Prime Auction A",
    description: "Prime auction circle dengan 10 anggota",
    mode: "AUCTION",
    minimumTier: 5,
    groupSize: 10,
    contributionAmountWei: "20000000000000000", // 0.0200 tBNB
    maxDiscountBps: 1500,
  },
  {
    externalPoolId: "PRM-A2",
    name: "Prime Auction B",
    description: "Prime auction circle dengan 5 anggota",
    mode: "AUCTION",
    minimumTier: 5,
    groupSize: 5,
    contributionAmountWei: "50000000000000000", // 0.0500 tBNB
    maxDiscountBps: 2000,
  },
];

// ─── Seed Functions ──────────────────────────────────────────────────────────

async function seedUser(data: UserSeed): Promise<string> {
  const user = await prisma.user.upsert({
    where: { walletAddress: data.walletAddress },
    update: {
      role: data.role,
    },
    create: {
      walletAddress: data.walletAddress,
      role: data.role,
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      username: data.username,
      email: data.email,
      emailVerifiedAt: data.emailVerified ? new Date() : null,
    },
    create: {
      userId: user.id,
      username: data.username,
      email: data.email,
      emailVerifiedAt: data.emailVerified ? new Date() : null,
    },
  });

  await prisma.reputation.upsert({
    where: { userId: user.id },
    update: {
      points: data.reputationPoints,
      tier: data.tier,
    },
    create: {
      userId: user.id,
      points: data.reputationPoints,
      tier: data.tier,
    },
  });

  console.log(
    `  ✓ User seeded: ${data.username} (${data.walletAddress}) — Tier ${data.tier}, ${data.reputationPoints} pts`
  );

  return user.id;
}

async function seedPool(data: PoolSeed): Promise<void> {
  const isAuction = data.mode === "AUCTION";

  await prisma.pool.upsert({
    where: { externalPoolId: data.externalPoolId },
    update: {
      name: data.name,
      description: data.description || "Rotating savings and credit pool.",
      mode: data.mode,
      minimumTier: data.minimumTier,
      groupSize: data.groupSize,
      cycleCount: data.groupSize, // cycleCount = groupSize
      cycleDurationDays: 30,
      paymentWindowDays: 10,
      auctionOpenDay: isAuction ? 11 : null,
      auctionCloseDay: isAuction ? 25 : null,
      settlementDay: 30,
      contributionAmountWei: data.contributionAmountWei,
      maxDiscountBps: data.maxDiscountBps,
      status: "ACTIVE",
    },
    create: {
      externalPoolId: data.externalPoolId,
      name: data.name,
      description: data.description || "Rotating savings and credit pool.",
      mode: data.mode,
      minimumTier: data.minimumTier,
      groupSize: data.groupSize,
      cycleCount: data.groupSize, // cycleCount = groupSize
      cycleDurationDays: 30,
      paymentWindowDays: 10,
      auctionOpenDay: isAuction ? 11 : null,
      auctionCloseDay: isAuction ? 25 : null,
      settlementDay: 30,
      contributionAmountWei: data.contributionAmountWei,
      maxDiscountBps: data.maxDiscountBps,
      status: "ACTIVE",
    },
  });

  console.log(
    `  ✓ Pool seeded: ${data.externalPoolId} — ${data.name} (${data.mode}, Tier ${data.minimumTier}, group ${data.groupSize})`
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🌱 Merit Circle — Seeding database...\n");

  // Seed admin user
  console.log("── Admin User ──");
  await seedUser(ADMIN_USER);

  // Seed demo users
  console.log("\n── Demo Users ──");
  for (const demoUser of DEMO_USERS) {
    await seedUser(demoUser);
  }

  // Seed pool catalog
  console.log("\n── Pool Catalog ──");
  for (const pool of POOL_CATALOG) {
    await seedPool(pool);
  }

  console.log("\n✅ Seed completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("❌ Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
