import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";
import { selectWinningBid } from "@merit-circle/domain";

describe("Phase 11 - Bid Submission & Winner Selection Tests", () => {
  let user1: any;
  let token1: string;
  let user2: any;
  let token2: string;
  let user3: any;
  let token3: string;
  let adminToken: string;
  let strangerToken: string;

  let auctionGroupId: string;
  let auctionCycle1Id: string;
  let auctionId: string;
  let minPayoutWei: string;
  let rewardPoolWei: string;

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
              username: `bidder_${i}`,
              email: `bidder_${i}@example.com`,
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

    const admin = await mockPrisma.user.create({
      data: {
        walletAddress: "0x" + "aa".repeat(20),
        role: "ADMIN",
        profile: {
          create: {
            username: "admin_boss",
            email: "admin@example.com",
            emailVerifiedAt: new Date(),
          },
        },
      },
    });
    adminToken = signJwt({ sub: admin.id, walletAddress: admin.walletAddress, role: "ADMIN" });

    const stranger = await mockPrisma.user.create({
      data: {
        walletAddress: "0x" + "bb".repeat(20),
        role: "USER",
        profile: {
          create: {
            username: "intruder",
            email: "intruder@example.com",
            emailVerifiedAt: new Date(),
          },
        },
      },
    });
    strangerToken = signJwt({ sub: stranger.id, walletAddress: stranger.walletAddress, role: "USER" });

    // Join TRUST-1 (pool size 3)
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

    // Open auction by admin
    const openRes = await request(app)
      .post(`/api/cycles/${auctionCycle1Id}/auction/open`)
      .set("Authorization", `Bearer ${adminToken}`);
    auctionId = openRes.body.auction.id;
    minPayoutWei = openRes.body.auction.minimumPayoutWei;
    rewardPoolWei = openRes.body.auction.rewardPoolWei;

    // User 1 & 2 pay current cycle contributions
    const contribs = await mockPrisma.contribution.findMany({
      where: { cycleId: auctionCycle1Id },
    });
    for (const c of contribs) {
      if (c.userId === user1.id || c.userId === user2.id) {
        await mockPrisma.contribution.update({
          where: { id: c.id },
          data: { status: "PAID_ON_TIME", paidAt: new Date() },
        });
      }
    }
  });

  it("submit bid requires auth", async () => {
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .send({ payoutAmountWei: minPayoutWei });
    expect(res.status).toBe(401);
  });

  it("submit bid requires group membership", async () => {
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ payoutAmountWei: minPayoutWei });
    expect(res.status).toBe(403);
  });

  it("submit bid rejects user who has not paid current cycle", async () => {
    // user3 has not paid
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token3}`)
      .send({ payoutAmountWei: minPayoutWei });
    expect(res.status).toBe(400);
    const err = res.body.error?.message || res.body.error;
    expect(err).toContain("paid current cycle");
  });

  it("submit bid rejects user who already received payout", async () => {
    // Mark user1 as already received payout
    await mockPrisma.groupMember.update({
      where: { groupId_userId: { groupId: auctionGroupId, userId: user1.id } },
      data: { hasReceivedPayout: true },
    });

    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ payoutAmountWei: minPayoutWei });
    expect(res.status).toBe(400);
    const err = res.body.error?.message || res.body.error;
    expect(err).toContain("already received a payout");
  });

  it("submit bid rejects payout below minimum payout", async () => {
    const belowMin = (BigInt(minPayoutWei) - 100n).toString();
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ payoutAmountWei: belowMin });
    expect(res.status).toBe(400);
  });

  it("submit bid rejects payout above reward pool", async () => {
    const abovePool = (BigInt(rewardPoolWei) + 100n).toString();
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ payoutAmountWei: abovePool });
    expect(res.status).toBe(400);
  });

  it("valid bid is stored with status VALID", async () => {
    const validAmount = minPayoutWei;
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ payoutAmountWei: validAmount });

    expect(res.status).toBe(201);
    expect(res.body.bidId).toBeDefined();
    expect(res.body.userId).toBe(user1.id);
    expect(res.body.payoutAmountWei).toBe(validAmount);
    expect(res.body.status).toBe("VALID");

    const listRes = await request(app)
      .get(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token1}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.bids.length).toBe(1);
    expect(listRes.body.bids[0].bidId).toBe(res.body.bidId);
  });

  it("submit bid rejects duplicate bid", async () => {
    await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ payoutAmountWei: minPayoutWei });

    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ payoutAmountWei: minPayoutWei });

    expect(res.status).toBe(400);
    const err = res.body.error?.message || res.body.error;
    expect(err).toContain("already submitted a bid");
  });

  it("lowest valid bid wins and tie breaks by earliest submittedAt", async () => {
    // User1 bids 13000000000000000
    // User2 bids 12500000000000000
    await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ payoutAmountWei: "13000000000000000" });

    await request(app)
      .post(`/api/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${token2}`)
      .send({ payoutAmountWei: "12500000000000000" });

    const auctionAfterBids = await request(app)
      .get(`/api/cycles/${auctionCycle1Id}/auction`)
      .set("Authorization", `Bearer ${token1}`);

    expect(auctionAfterBids.body.bestBid.userId).toBe(user2.id);
    expect(auctionAfterBids.body.bestBid.payoutAmountWei).toBe("12500000000000000");

    // Direct unit test of selectWinningBid tie breaker
    const candidateA = {
      bidId: "bid_1",
      userId: "u1",
      payoutAmountWei: 12000000000000000n,
      submittedAt: 1000,
    };
    const candidateB = {
      bidId: "bid_2",
      userId: "u2",
      payoutAmountWei: 12000000000000000n,
      submittedAt: 1500,
    };
    const winner = selectWinningBid([candidateA, candidateB]);
    expect(winner?.bidId).toBe("bid_1");

    // Empty bids produces null
    expect(selectWinningBid([])).toBeNull();
  });
});
