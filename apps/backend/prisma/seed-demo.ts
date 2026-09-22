/**
 * Merit Circle — Demo Seed Script
 * Phase 13 — Admin / Demo / Smoke Test
 *
 * Idempotent seed creating:
 * - Admin user (admin@meritcircle.local, role ADMIN, points 1000)
 * - Demo users across tiers (demo-tier1, demo-tier2, demo-tier3, demo-tier4-a..e, demo-tier5)
 * - 12 Catalog Pools (Basic & Auction)
 * - Demo forming groups
 */

import path from "path";
import dotenv from "dotenv";

// Load .env from backend directory or project root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.DATABASE_URL) {
  console.error("\n❌ [Seed Demo Error]: Environment variable DATABASE_URL is not set.");
  console.error("Please configure DATABASE_URL in your .env file before seeding.");
  console.error("Example: DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/merit_circle?schema=public\"\n");
  process.exit(1);
}

import { PrismaClient, PoolMode, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

interface DemoUserDef {
  walletAddress: string;
  username: string;
  email: string;
  role: UserRole;
  points: number;
  tier: number;
}

const ADMIN_USER: DemoUserDef = {
  walletAddress: "0xAdmin000000000000000000000000000000000001".toLowerCase(),
  username: "admin",
  email: "admin@meritcircle.local",
  role: "ADMIN",
  points: 1000,
  tier: 5,
};

const DEMO_USERS: DemoUserDef[] = [
  {
    walletAddress: "0xDemo0000000000000000000000000000000000001".toLowerCase(),
    username: "demo-tier1",
    email: "demo-tier1@meritcircle.local",
    role: "USER",
    points: 100,
    tier: 1,
  },
  {
    walletAddress: "0xDemo0000000000000000000000000000000000002".toLowerCase(),
    username: "demo-tier2",
    email: "demo-tier2@meritcircle.local",
    role: "USER",
    points: 400,
    tier: 2,
  },
  {
    walletAddress: "0xDemo0000000000000000000000000000000000003".toLowerCase(),
    username: "demo-tier3",
    email: "demo-tier3@meritcircle.local",
    role: "USER",
    points: 700,
    tier: 3,
  },
  {
    walletAddress: "0xDemo000000000000000000000000000000000004a".toLowerCase(),
    username: "demo-tier4-a",
    email: "demo-tier4-a@meritcircle.local",
    role: "USER",
    points: 900,
    tier: 4,
  },
  {
    walletAddress: "0xDemo000000000000000000000000000000000004b".toLowerCase(),
    username: "demo-tier4-b",
    email: "demo-tier4-b@meritcircle.local",
    role: "USER",
    points: 900,
    tier: 4,
  },
  {
    walletAddress: "0xDemo000000000000000000000000000000000004c".toLowerCase(),
    username: "demo-tier4-c",
    email: "demo-tier4-c@meritcircle.local",
    role: "USER",
    points: 900,
    tier: 4,
  },
  {
    walletAddress: "0xDemo000000000000000000000000000000000004d".toLowerCase(),
    username: "demo-tier4-d",
    email: "demo-tier4-d@meritcircle.local",
    role: "USER",
    points: 900,
    tier: 4,
  },
  {
    walletAddress: "0xDemo000000000000000000000000000000000004e".toLowerCase(),
    username: "demo-tier4-e",
    email: "demo-tier4-e@meritcircle.local",
    role: "USER",
    points: 900,
    tier: 4,
  },
  {
    walletAddress: "0xDemo0000000000000000000000000000000000005".toLowerCase(),
    username: "demo-tier5",
    email: "demo-tier5@meritcircle.local",
    role: "USER",
    points: 1000,
    tier: 5,
  },
];

interface PoolDef {
  externalPoolId: string;
  name: string;
  description: string;
  mode: PoolMode;
  minimumTier: number;
  groupSize: number;
  cycleCount: number;
  cycleDurationDays: number;
  paymentWindowDays: number;
  auctionOpenDay: number | null;
  auctionCloseDay: number | null;
  settlementDay: number;
  contributionAmountWei: string;
  maxDiscountBps: number | null;
}

const POOLS: PoolDef[] = [
  {
    externalPoolId: "START-1",
    name: "Starter Circle (Newcomer)",
    description: "Kelompok arisan perdana untuk Newcomer (3 anggota) tanpa syarat minimal poin reputasi.",
    mode: "BASIC",
    minimumTier: 1,
    groupSize: 3,
    cycleCount: 3,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: null,
    auctionCloseDay: null,
    settlementDay: 30,
    contributionAmountWei: "800000000000000", // 0.0008 tBNB (Termurah / Newcomer)
    maxDiscountBps: null,
  },
  {
    externalPoolId: "CIT-1",
    name: "Citizen Circle A",
    description: "Citizen circle with 3 members",
    mode: "BASIC",
    minimumTier: 2,
    groupSize: 3,
    cycleCount: 3,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: null,
    auctionCloseDay: null,
    settlementDay: 30,
    contributionAmountWei: "1000000000000000", // 0.0010 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "CIT-2",
    name: "Citizen Circle B",
    description: "Citizen circle with 5 members",
    mode: "BASIC",
    minimumTier: 2,
    groupSize: 5,
    cycleCount: 5,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: null,
    auctionCloseDay: null,
    settlementDay: 30,
    contributionAmountWei: "1500000000000000", // 0.0015 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "CIT-3",
    name: "Citizen Circle C",
    description: "Citizen circle with 7 members",
    mode: "BASIC",
    minimumTier: 2,
    groupSize: 7,
    cycleCount: 7,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: null,
    auctionCloseDay: null,
    settlementDay: 30,
    contributionAmountWei: "2000000000000000", // 0.0020 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "BLD-1",
    name: "Builder Circle A",
    description: "Builder circle with 5 members",
    mode: "BASIC",
    minimumTier: 3,
    groupSize: 5,
    cycleCount: 5,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: null,
    auctionCloseDay: null,
    settlementDay: 30,
    contributionAmountWei: "3000000000000000", // 0.0030 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "BLD-2",
    name: "Builder Circle B",
    description: "Builder circle with 7 members",
    mode: "BASIC",
    minimumTier: 3,
    groupSize: 7,
    cycleCount: 7,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: null,
    auctionCloseDay: null,
    settlementDay: 30,
    contributionAmountWei: "4000000000000000", // 0.0040 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "BLD-3",
    name: "Builder Circle C",
    description: "Builder circle with 10 members",
    mode: "BASIC",
    minimumTier: 3,
    groupSize: 10,
    cycleCount: 10,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: null,
    auctionCloseDay: null,
    settlementDay: 30,
    contributionAmountWei: "5000000000000000", // 0.0050 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "TRU-1",
    name: "Trusted Basic A",
    description: "Trusted tier basic circle with 5 members",
    mode: "BASIC",
    minimumTier: 4,
    groupSize: 5,
    cycleCount: 5,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: null,
    auctionCloseDay: null,
    settlementDay: 30,
    contributionAmountWei: "8000000000000000", // 0.0080 tBNB
    maxDiscountBps: null,
  },
  {
    externalPoolId: "TRU-A1",
    name: "Trusted Auction A",
    description: "Trusted tier auction circle with 5 members",
    mode: "AUCTION",
    minimumTier: 4,
    groupSize: 5,
    cycleCount: 5,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: 11,
    auctionCloseDay: 25,
    settlementDay: 30,
    contributionAmountWei: "10000000000000000", // 0.0100 tBNB
    maxDiscountBps: 1000,
  },
  {
    externalPoolId: "TRU-A2",
    name: "Trusted Auction B",
    description: "Trusted tier auction circle with 7 members",
    mode: "AUCTION",
    minimumTier: 4,
    groupSize: 7,
    cycleCount: 7,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: 11,
    auctionCloseDay: 25,
    settlementDay: 30,
    contributionAmountWei: "12000000000000000", // 0.0120 tBNB
    maxDiscountBps: 1200,
  },
  {
    externalPoolId: "PRM-A1",
    name: "Prime Auction A",
    description: "Prime tier auction circle with 10 members",
    mode: "AUCTION",
    minimumTier: 5,
    groupSize: 10,
    cycleCount: 10,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: 11,
    auctionCloseDay: 25,
    settlementDay: 30,
    contributionAmountWei: "20000000000000000", // 0.0200 tBNB
    maxDiscountBps: 1500,
  },
  {
    externalPoolId: "PRM-A2",
    name: "Prime Auction B",
    description: "Prime tier auction circle with 5 members",
    mode: "AUCTION",
    minimumTier: 5,
    groupSize: 5,
    cycleCount: 5,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: 11,
    auctionCloseDay: 25,
    settlementDay: 30,
    contributionAmountWei: "50000000000000000", // 0.0500 tBNB
    maxDiscountBps: 2000,
  },
];

async function seedUser(def: DemoUserDef): Promise<string> {
  const user = await prisma.user.upsert({
    where: { walletAddress: def.walletAddress },
    update: {
      role: def.role,
      status: "ACTIVE",
    },
    create: {
      walletAddress: def.walletAddress,
      role: def.role,
      status: "ACTIVE",
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      username: def.username,
      email: def.email,
      emailVerifiedAt: new Date(),
    },
    create: {
      userId: user.id,
      username: def.username,
      email: def.email,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.reputation.upsert({
    where: { userId: user.id },
    update: {
      points: def.points,
      tier: def.tier,
    },
    create: {
      userId: user.id,
      points: def.points,
      tier: def.tier,
    },
  });

  return user.id;
}

async function seedPool(def: PoolDef): Promise<string> {
  const pool = await prisma.pool.upsert({
    where: { externalPoolId: def.externalPoolId },
    update: {
      name: def.name,
      description: def.description,
      mode: def.mode,
      minimumTier: def.minimumTier,
      groupSize: def.groupSize,
      cycleCount: def.cycleCount,
      cycleDurationDays: def.cycleDurationDays,
      paymentWindowDays: def.paymentWindowDays,
      auctionOpenDay: def.auctionOpenDay,
      auctionCloseDay: def.auctionCloseDay,
      settlementDay: def.settlementDay,
      contributionAmountWei: def.contributionAmountWei,
      maxDiscountBps: def.maxDiscountBps,
      status: "ACTIVE",
    },
    create: {
      externalPoolId: def.externalPoolId,
      name: def.name,
      description: def.description,
      mode: def.mode,
      minimumTier: def.minimumTier,
      groupSize: def.groupSize,
      cycleCount: def.cycleCount,
      cycleDurationDays: def.cycleDurationDays,
      paymentWindowDays: def.paymentWindowDays,
      auctionOpenDay: def.auctionOpenDay,
      auctionCloseDay: def.auctionCloseDay,
      settlementDay: def.settlementDay,
      contributionAmountWei: def.contributionAmountWei,
      maxDiscountBps: def.maxDiscountBps,
      status: "ACTIVE",
    },
  });
  return pool.id;
}

export async function main() {
  console.log("Starting demo seed...");

  // 1. Seed Admin
  const adminId = await seedUser(ADMIN_USER);
  console.log(`[Seed] Admin user seeded: ${adminId}`);

  // 2. Seed Demo Users
  const userIds: Record<string, string> = {};
  for (const userDef of DEMO_USERS) {
    const uid = await seedUser(userDef);
    userIds[userDef.username] = uid;
    console.log(`[Seed] Demo user seeded: ${userDef.username} (${uid})`);
  }

  // 3. Seed Pools
  const poolIds: Record<string, string> = {};
  for (const poolDef of POOLS) {
    const pid = await seedPool(poolDef);
    poolIds[poolDef.externalPoolId] = pid;
    console.log(`[Seed] Pool seeded: ${poolDef.externalPoolId} (${pid})`);
  }

  // 4. Seed Demo Forming Groups
  // One FORMING START-1 group with 1 demo user (demo-tier1)
  const start1Pool = await prisma.pool.findUnique({ where: { externalPoolId: "START-1" } });
  if (start1Pool && userIds["demo-tier1"]) {
    const existingGroup = await prisma.group.findFirst({
      where: { poolId: start1Pool.id, status: "FORMING" },
    });
    if (!existingGroup) {
      const g = await prisma.group.create({
        data: {
          poolId: start1Pool.id,
          groupNumber: 1,
          status: "FORMING",
          memberCount: 1,
          members: {
            create: {
              userId: userIds["demo-tier1"],
              payoutSlot: 1,
            },
          },
        },
      });
      console.log(`[Seed] Forming START-1 group created: ${g.id}`);
    }
  }

  // One FORMING TRU-A1 group with 1 demo Tier 4 user (demo-tier4-a)
  const truA1Pool = await prisma.pool.findUnique({ where: { externalPoolId: "TRU-A1" } });
  if (truA1Pool && userIds["demo-tier4-a"]) {
    const existingGroup = await prisma.group.findFirst({
      where: { poolId: truA1Pool.id, status: "FORMING" },
    });
    if (!existingGroup) {
      const g = await prisma.group.create({
        data: {
          poolId: truA1Pool.id,
          groupNumber: 1,
          status: "FORMING",
          memberCount: 1,
          members: {
            create: {
              userId: userIds["demo-tier4-a"],
              payoutSlot: 1,
            },
          },
        },
      });
      console.log(`[Seed] Forming TRU-A1 group created: ${g.id}`);
    }
  }

  // Record audit log for demo seed
  await prisma.auditLog.create({
    data: {
      actorUserId: adminId,
      actorType: "ADMIN",
      action: "SEED_DEMO",
      entityType: "SYSTEM",
      metadata: {
        isDemoTool: true,
        seededAt: new Date().toISOString(),
        demoUsersCount: DEMO_USERS.length,
        poolsCount: POOLS.length,
      },
    },
  });

  console.log("Demo seed finished successfully.");
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
