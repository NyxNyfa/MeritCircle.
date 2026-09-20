import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 11 - Settlement Service Tests", () => {
  let user1: any;
  let token1: string;
  let user2: any;
  let token2: string;
  let user3: any;
  let token3: string;
  let adminToken: string;

  let auctionGroupId: string;
  let auctionCycle1Id: string;
  let auctionCycle2Id: string;
  let auctionId: string;

  let basicGroupId: string;
  let basicCycle1Id: string;

  beforeEach(async () => {
    resetMockDb();

    const users = [];
    const tokens = [];
    for (let i = 1; i <= 3; i++) {
      const u = await mockPrisma.user.create({
        data: {
          walletAddress: `0x${i.toString(16).padStart(2, "0").repeat(20)}`,
          role: "USER",
          profile: {
            create: {
              username: `member_${i}`,
              email: `member_${i}@example.com`,
              emailVerifiedAt: new Date(),
            },
          },
          reputation: {
            create: {
              points: 850 - i * 10, // user1 has highest reputation (840), then user2 (830), then user3 (820) -> all tier 4
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

    const admin = await mockPrisma.user.create({
      data: {
        walletAddress: "0x" + "aa".repeat(20),
        role: "ADMIN",
        profile: {
          create: {
            username: "admin_tester",
            email: "admin@example.com",
            emailVerifiedAt: new Date(),
          },
        },
      },
    });
    adminToken = signJwt({ sub: admin.id, walletAddress: admin.walletAddress, role: "ADMIN" });

    // 1. Join TRUST-1
    let lastAuctionJoinRes: any;
    for (let i = 0; i < 3; i++) {
      lastAuctionJoinRes = await request(app)
        .post("/api/pools/TRUST-1/join")
        .set("Authorization", `Bearer ${tokens[i]}`);
    }
    auctionGroupId = lastAuctionJoinRes.body.groupId;

    const auctionCycles = await mockPrisma.cycle.findMany({
      where: { groupId: auctionGroupId },
      orderBy: { cycleNumber: "asc" },
    });
    auctionCycle1Id = auctionCycles[0].id;
    auctionCycle2Id = auctionCycles[1].id;

    // 2. Join CIT-1 (Basic pool)
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

  it("settle requires ADMIN role", async () => {
    const res = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/settle`)
      .set("Authorization", `Bearer ${token1}`);
    expect(res.status).toBe(403);
  });

  it("settle rejects cycle that is not current cycle", async () => {
    // auctionCycle2 is cycle 2, current cycle is 1
    const res = await request(app)
      .post(`/api/cycles/${auctionCycle2Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    const err = res.body.error?.message || res.body.error;
    expect(err).toContain("current active cycle");
  });

  it("settle rejects if not all contributions are paid", async () => {
    // None paid yet
    const res = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    const err = res.body.error?.message || res.body.error;
    expect(err).toContain("Not all members have paid");
  });

  it("settle auction rejects auction not CLOSED", async () => {
    // Pay all contributions
    const contribs = await mockPrisma.contribution.findMany({
      where: { cycleId: auctionCycle1Id },
    });
    for (const c of contribs) {
      await mockPrisma.contribution.update({
        where: { id: c.id },
        data: { status: "PAID_ON_TIME", paidAt: new Date() },
      });
    }

    // Open auction
    await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Try settle while auction is OPEN
    const res = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    const err = res.body.error?.message || res.body.error;
    expect(err).toContain("Auction must be CLOSED");
  });

  it("settle auction with winner pays winning bid and updates carryover", async () => {
    // 1. Pay contributions
    const contribs = await mockPrisma.contribution.findMany({
      where: { cycleId: auctionCycle1Id },
    });
    for (const c of contribs) {
      await mockPrisma.contribution.update({
        where: { id: c.id },
        data: { status: "PAID_ON_TIME", paidAt: new Date() },
      });
    }

    // 2. Open auction
    const openRes = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);
    auctionId = openRes.body.auction.id;

    // 3. User2 bids 13000000000000000 (pool is 15000000000000000)
    await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token2}`)
      .send({ payoutAmountWei: "13000000000000000" });

    // 4. Close auction
    await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/close`)
      .set("Authorization", `Bearer ${adminToken}`);

    // 5. Settle cycle
    const settleRes = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(settleRes.status).toBe(200);
    expect(settleRes.body.success).toBe(true);
    expect(settleRes.body.payout.recipientUserId).toBe(user2.id);
    expect(settleRes.body.payout.amountWei).toBe("13000000000000000");
    expect(settleRes.body.ledger.remainingCarryRewardWei).toBe("2000000000000000"); // 15 - 13 = 2

    // Check recipient hasReceivedPayout
    const member2 = await mockPrisma.groupMember.findFirst({
      where: { groupId: auctionGroupId, userId: user2.id },
    });
    expect(member2?.hasReceivedPayout).toBe(true);

    // Check group current cycle incremented
    const grp = await mockPrisma.group.findUnique({ where: { id: auctionGroupId } });
    expect(grp.currentCycle).toBe(2);

    // Protected from duplicate settlement
    const dupRes = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(dupRes.status).toBe(400);
  });

  it("settle auction with no bid uses fallback recipient with full reward pool and zero carry", async () => {
    // Pay contributions
    const contribs = await mockPrisma.contribution.findMany({
      where: { cycleId: auctionCycle1Id },
    });
    for (const c of contribs) {
      await mockPrisma.contribution.update({
        where: { id: c.id },
        data: { status: "PAID_ON_TIME", paidAt: new Date() },
      });
    }

    // Open & Close auction with NO bids
    await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/close`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Settle
    const settleRes = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(settleRes.status).toBe(200);
    // Highest reputation is user1
    expect(settleRes.body.payout.recipientUserId).toBe(user1.id);
    expect(settleRes.body.payout.amountWei).toBe("15000000000000000");
    expect(settleRes.body.ledger.remainingCarryRewardWei).toBe("0");
  });

  it("settle basic cycle pays full reward pool and leaves 0 carryover", async () => {
    // Pay contributions in basic cycle
    const contribs = await mockPrisma.contribution.findMany({
      where: { cycleId: basicCycle1Id },
    });
    for (const c of contribs) {
      await mockPrisma.contribution.update({
        where: { id: c.id },
        data: { status: "PAID_ON_TIME", paidAt: new Date() },
      });
    }

    const settleRes = await request(app)
      .post(`/api/cycles/${basicCycle1Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(settleRes.status).toBe(200);
    expect(settleRes.body.payout.type).toBe("BASIC_CYCLE");
    expect(settleRes.body.payout.amountWei).toBe("3000000000000000");
    expect(settleRes.body.ledger.remainingCarryRewardWei).toBe("0");
  });
});
