import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 11 - Auction Module Tests", () => {
  let user1: any;
  let token1: string;
  let user2: any;
  let token2: string;
  let user3: any;
  let token3: string;
  let adminUser: any;
  let adminToken: string;
  let nonMember: any;
  let nonMemberToken: string;

  let auctionGroupId: string;
  let auctionCycle1Id: string;
  let auctionCycle3Id: string; // final cycle

  let basicGroupId: string;
  let basicCycle1Id: string;

  beforeEach(async () => {
    resetMockDb();

    // Create 3 users for auction group (TRUST-1 requires tier 4)
    const users = [];
    const tokens = [];
    for (let i = 1; i <= 3; i++) {
      const u = await mockPrisma.user.create({
        data: {
          walletAddress: `0x${i.toString(16).padStart(2, "0").repeat(20)}`,
          role: "USER",
          profile: {
            create: {
              username: `auction_user_${i}`,
              email: `user_${i}@example.com`,
              emailVerifiedAt: new Date(),
            },
          },
          reputation: {
            create: {
              points: 800,
              tier: 4,
            },
          },
        },
        include: { profile: true, reputation: true },
      });
      const t = signJwt({ sub: u.id, walletAddress: u.walletAddress, role: u.role });
      users.push(u);
      tokens.push(t);
    }

    user1 = users[0];
    token1 = tokens[0];
    user2 = users[1];
    token2 = tokens[1];
    user3 = users[2];
    token3 = tokens[2];

    // Admin user
    adminUser = await mockPrisma.user.create({
      data: {
        walletAddress: "0x" + "aa".repeat(20),
        role: "ADMIN",
        profile: {
          create: {
            username: "admin_user",
            email: "admin@example.com",
            emailVerifiedAt: new Date(),
          },
        },
        reputation: {
          create: {
            points: 1000,
            tier: 5,
          },
        },
      },
      include: { profile: true, reputation: true },
    });
    adminToken = signJwt({
      sub: adminUser.id,
      walletAddress: adminUser.walletAddress,
      role: "ADMIN",
    });

    // Non member
    nonMember = await mockPrisma.user.create({
      data: {
        walletAddress: "0x" + "ff".repeat(20),
        role: "USER",
        profile: {
          create: {
            username: "stranger",
            email: "stranger@example.com",
            emailVerifiedAt: new Date(),
          },
        },
        reputation: {
          create: {
            points: 200,
            tier: 2,
          },
        },
      },
      include: { profile: true, reputation: true },
    });
    nonMemberToken = signJwt({
      sub: nonMember.id,
      walletAddress: nonMember.walletAddress,
      role: "USER",
    });

    // 1. Join TRUST-1 (Auction pool, 3 members) -> activates group
    let lastJoinRes: any;
    for (let i = 0; i < 3; i++) {
      lastJoinRes = await request(app)
        .post("/api/pools/TRUST-1/join")
        .set("Authorization", `Bearer ${tokens[i]}`);
    }
    auctionGroupId = lastJoinRes.body.groupId;

    const auctionCycles = await mockPrisma.cycle.findMany({
      where: { groupId: auctionGroupId },
      orderBy: { cycleNumber: "asc" },
    });
    auctionCycle1Id = auctionCycles[0].id;
    auctionCycle3Id = auctionCycles[2].id;

    // 2. Join CIT-1 (Basic pool, 3 members) -> activates group
    let lastBasicJoinRes: any;
    for (let i = 0; i < 3; i++) {
      lastBasicJoinRes = await request(app)
        .post("/api/pools/CIT-1/join")
        .set("Authorization", `Bearer ${tokens[i]}`);
    }
    basicGroupId = lastBasicJoinRes.body.groupId;

    const basicCycles = await mockPrisma.cycle.findMany({
      where: { groupId: basicGroupId },
      orderBy: { cycleNumber: "asc" },
    });
    basicCycle1Id = basicCycles[0].id;
  });

  it("GET auction returns auction for AUCTION non-final cycle", async () => {
    const res = await request(app)
      .get(`/api/cycles/${auctionCycle1Id}/auction`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("AUCTION");
    expect(res.body.isFinalCycle).toBe(false);
    expect(res.body.rewardPoolWei).toBeDefined();
    expect(res.body.minimumPayoutWei).toBeDefined();
    expect(res.body.maxDiscountBps).toBe(2000);
    expect(res.body.myEligibility).toBeDefined();
  });

  it("GET auction returns auctionEnabled false for BASIC pool", async () => {
    const res = await request(app)
      .get(`/api/cycles/${basicCycle1Id}/auction`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("BASIC");
    expect(res.body.auctionEnabled).toBe(false);
    expect(res.body.isFinalCycle).toBe(false);
    expect(res.body.rewardPoolWei).toBeDefined();
  });

  it("GET auction returns final cycle message for final cycle", async () => {
    const res = await request(app)
      .get(`/api/cycles/${auctionCycle3Id}/auction`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.isFinalCycle).toBe(true);
    expect(res.body.auctionEnabled).toBe(false);
    expect(res.body.finalRewardPoolWei).toBeDefined();
    expect(res.body.message).toContain("Final cycle pays full reward pool");
  });

  it("GET auction requires group membership", async () => {
    const res = await request(app)
      .get(`/api/cycles/${auctionCycle1Id}/auction`)
      .set("Authorization", `Bearer ${nonMemberToken}`);

    expect(res.status).toBe(403);
  });

  it("open auction requires ADMIN", async () => {
    const resUser = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${token1}`);
    expect(resUser.status).toBe(403);

    const resAdmin = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.success).toBe(true);
    expect(resAdmin.body.auction.status).toBe("OPEN");
  });

  it("open auction rejects BASIC pool", async () => {
    const res = await request(app)
      .post(`/api/cycles/${basicCycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it("open auction rejects final cycle", async () => {
    const res = await request(app)
      .post(`/api/cycles/${auctionCycle3Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it("close auction requires ADMIN", async () => {
    // Open first
    await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);

    const resUser = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/close`)
      .set("Authorization", `Bearer ${token1}`);
    expect(resUser.status).toBe(403);

    const resAdmin = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/close`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.success).toBe(true);
    expect(resAdmin.body.auction.status).toBe("CLOSED");
  });

  it("close auction rejects auction not OPEN", async () => {
    // Not opened yet
    const res = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/close`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});
