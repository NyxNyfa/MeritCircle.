import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 11 - Reward Ledger Tests", () => {
  let user1: any;
  let token1: string;
  let adminToken: string;
  let groupId: string;
  let cycle1Id: string;

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
              username: `ledger_user_${i}`,
              email: `luser_${i}@example.com`,
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

    const admin = await mockPrisma.user.create({
      data: {
        walletAddress: "0x" + "aa".repeat(20),
        role: "ADMIN",
        profile: {
          create: {
            username: "admin_ledger",
            email: "admin_l@example.com",
            emailVerifiedAt: new Date(),
          },
        },
      },
    });
    adminToken = signJwt({ sub: admin.id, walletAddress: admin.walletAddress, role: "ADMIN" });

    // Join TRUST-1
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
  });

  it("ledger projects cycle 1, 2, and 3 when none are settled", async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/reward-ledger`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.groupId).toBe(groupId);
    expect(res.body.groupSize).toBe(3);
    expect(res.body.contributionAmountWei).toBe("5000000000000000");

    const ledger = res.body.ledger;
    expect(ledger.length).toBe(3);
    expect(ledger[0].cycleNumber).toBe(1);
    expect(ledger[0].baseRewardWei).toBe("15000000000000000"); // 3 * 5 BNB
    expect(ledger[0].carriedRewardWei).toBe("0");
    expect(ledger[0].rewardPoolWei).toBe("15000000000000000");
    expect(ledger[0].status).toBe("PROJECTED");
    expect(ledger[0].payoutWei).toBeNull();
  });

  it("ledger carries reward from previous settled cycle into next cycle", async () => {
    // 1. Pay all contributions for cycle 1
    const contribs = await mockPrisma.contribution.findMany({
      where: { cycleId: cycle1Id },
    });
    for (const c of contribs) {
      await mockPrisma.contribution.update({
        where: { id: c.id },
        data: { status: "PAID_ON_TIME", paidAt: new Date() },
      });
    }

    // 2. Open auction, submit bid, close auction
    const openRes = await request(app)
      .post(`/api/cycles/${cycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);
    const auctionId = openRes.body.auction.id;

    // Bid 12 BNB (out of 15 BNB pool) -> carryover = 3 BNB
    await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ payoutAmountWei: "12000000000000000" });

    await request(app)
      .post(`/api/cycles/${cycle1Id}/auction/close`)
      .set("Authorization", `Bearer ${adminToken}`);

    // 3. Settle cycle 1
    await request(app)
      .post(`/api/cycles/${cycle1Id}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);

    // 4. Check reward ledger
    const res = await request(app)
      .get(`/api/groups/${groupId}/reward-ledger`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    const ledger = res.body.ledger;

    // Cycle 1: SETTLED
    expect(ledger[0].status).toBe("SETTLED");
    expect(ledger[0].baseRewardWei).toBe("15000000000000000");
    expect(ledger[0].carriedRewardWei).toBe("0");
    expect(ledger[0].rewardPoolWei).toBe("15000000000000000");
    expect(ledger[0].payoutWei).toBe("12000000000000000");
    expect(ledger[0].remainingCarryRewardWei).toBe("3000000000000000");

    // Cycle 2: PROJECTED with carriedReward = 3 BNB, total rewardPool = 18 BNB
    expect(ledger[1].status).toBe("PROJECTED");
    expect(ledger[1].baseRewardWei).toBe("15000000000000000");
    expect(ledger[1].carriedRewardWei).toBe("3000000000000000");
    expect(ledger[1].rewardPoolWei).toBe("18000000000000000");
  });
});
