import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 11 - Final Cycle & No Final Surplus Tests", () => {
  let user1: any;
  let token1: string;
  let user2: any;
  let token2: string;
  let user3: any;
  let token3: string;
  let adminToken: string;

  let groupId: string;
  let cycle1Id: string;
  let cycle2Id: string;
  let cycle3Id: string; // final cycle

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
              username: `final_user_${i}`,
              email: `fuser_${i}@example.com`,
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
            username: "admin_final",
            email: "admin_f@example.com",
            emailVerifiedAt: new Date(),
          },
        },
      },
    });
    adminToken = signJwt({ sub: admin.id, walletAddress: admin.walletAddress, role: "ADMIN" });

    // Join TRUST-1 (group of 3)
    let lastJoinRes: any;
    for (let i = 0; i < 3; i++) {
      lastJoinRes = await request(app)
        .post("/api/pools/TRUST-1/join")
        .set("Authorization", `Bearer ${tokens[i]}`);
    }
    groupId = lastJoinRes.body.groupId;

    const cycles = await mockPrisma.cycle.findMany({
      where: { groupId },
      orderBy: { cycleNumber: "asc" },
    });
    cycle1Id = cycles[0].id;
    cycle2Id = cycles[1].id;
    cycle3Id = cycles[2].id;
  });

  it("final cycle cannot open auction", async () => {
    const res = await request(app)
      .post(`/api/cycles/${cycle3Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    const err = res.body.error?.message || res.body.error;
    expect(err).toContain("final cycle");
  });

  it("settles cycle 1 and 2, then verifies final cycle settlement pays full reward pool and leaves ZERO carry (NO FINAL SURPLUS)", async () => {
    // ─── Cycle 1 Settlement (User 1 wins at 13 BNB out of 15 BNB pool -> 2 BNB carry) ───
    const contribs1 = await mockPrisma.contribution.findMany({ where: { cycleId: cycle1Id } });
    for (const c of contribs1) {
      await mockPrisma.contribution.update({
        where: { id: c.id },
        data: { status: "PAID_ON_TIME", paidAt: new Date() },
      });
    }

    const open1 = await request(app)
      .post(`/api/cycles/${cycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);
    const auction1Id = open1.body.auction.id;

    await request(app)
      .post(`/api/auctions/${auction1Id}/bids`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ payoutAmountWei: "13000000000000000" });

    await request(app)
      .post(`/api/cycles/${cycle1Id}/auction/close`)
      .set("Authorization", `Bearer ${adminToken}`);

    await request(app)
      .post(`/api/cycles/${cycle1Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);

    // ─── Cycle 2 Settlement (Base 15 + Carried 2 = 17 BNB. User 2 wins at 15 BNB -> 2 BNB carry) ───
    const contribs2 = await mockPrisma.contribution.findMany({ where: { cycleId: cycle2Id } });
    for (const c of contribs2) {
      await mockPrisma.contribution.update({
        where: { id: c.id },
        data: { status: "PAID_ON_TIME", paidAt: new Date() },
      });
    }

    const open2 = await request(app)
      .post(`/api/cycles/${cycle2Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);
    const auction2Id = open2.body.auction.id;

    await request(app)
      .post(`/api/auctions/${auction2Id}/bids`)
      .set("Authorization", `Bearer ${token2}`)
      .send({ payoutAmountWei: "15000000000000000" });

    await request(app)
      .post(`/api/cycles/${cycle2Id}/auction/close`)
      .set("Authorization", `Bearer ${adminToken}`);

    await request(app)
      .post(`/api/cycles/${cycle2Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);

    // ─── Cycle 3 (Final Cycle): Base 15 + Carried 2 = 17 BNB ───
    // Check GET auction endpoint for final cycle
    const finalAuctionRes = await request(app)
      .get(`/api/cycles/${cycle3Id}/auction`)
      .set("Authorization", `Bearer ${token3}`);

    expect(finalAuctionRes.status).toBe(200);
    expect(finalAuctionRes.body.isFinalCycle).toBe(true);
    expect(finalAuctionRes.body.auctionEnabled).toBe(false);
    expect(finalAuctionRes.body.finalRewardPoolWei).toBe("17000000000000000");

    // Pay all contributions for cycle 3
    const contribs3 = await mockPrisma.contribution.findMany({ where: { cycleId: cycle3Id } });
    for (const c of contribs3) {
      await mockPrisma.contribution.update({
        where: { id: c.id },
        data: { status: "PAID_ON_TIME", paidAt: new Date() },
      });
    }

    // Settle final cycle
    const finalSettleRes = await request(app)
      .post(`/api/cycles/${cycle3Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(finalSettleRes.status).toBe(200);
    expect(finalSettleRes.body.success).toBe(true);
    expect(finalSettleRes.body.payout.type).toBe("FINAL_CYCLE");
    // Only user3 has not received payout, so user3 must be recipient
    expect(finalSettleRes.body.payout.recipientUserId).toBe(user3.id);
    // Payout is full reward pool = 17 BNB
    expect(finalSettleRes.body.payout.amountWei).toBe("17000000000000000");
    // CRITICAL: ZERO REMAINING CARRY (NO FINAL SURPLUS)
    expect(finalSettleRes.body.ledger.remainingCarryRewardWei).toBe("0");

    // Group is COMPLETED
    const grp = await mockPrisma.group.findUnique({ where: { id: groupId } });
    expect(grp.status).toBe("COMPLETED");

    // GROUP_COMPLETED reputation event awarded (+100) to each member
    const events = mockPrisma.auditLog; // Check reputation events
    const rep1 = await mockPrisma.reputation.findUnique({ where: { userId: user1.id } });
    const rep2 = await mockPrisma.reputation.findUnique({ where: { userId: user2.id } });
    const rep3 = await mockPrisma.reputation.findUnique({ where: { userId: user3.id } });

    // Initial 800 + 100 = 900
    expect(rep1.points).toBe(900);
    expect(rep2.points).toBe(900);
    expect(rep3.points).toBe(900);
  });
});
