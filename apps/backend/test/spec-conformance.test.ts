import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateLatePenalty,
  calculateLateDays,
  getTierFromPoints,
  clampReputationPoints,
  canJoinPool,
  TIERS,
  PoolSnapshot,
} from "@merit-circle/domain";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import request from "supertest";
import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Specification Conformance Suite — Layer B & D Rules (PRD Protocol Rules)", () => {
  beforeEach(() => {
    resetMockDb();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // R-19 & R-20: Late Payment Penalties
  // ─────────────────────────────────────────────────────────────────────────
  it("R-19: Penalty capped at -100 points maximum per cycle", () => {
    expect(calculateLatePenalty(10)).toBe(100);
    expect(calculateLatePenalty(15)).toBe(100);
    expect(calculateLatePenalty(30)).toBe(100);
    expect(calculateLatePenalty(100)).toBe(100);
  });

  it("R-20: Penalty equals daysLate * 10 after payment window (day 10)", () => {
    expect(calculateLateDays(10, 10)).toBe(0);
    expect(calculateLatePenalty(calculateLateDays(10, 10))).toBe(0);

    expect(calculateLateDays(11, 10)).toBe(1);
    expect(calculateLatePenalty(calculateLateDays(11, 10))).toBe(10);

    expect(calculateLateDays(12, 10)).toBe(2);
    expect(calculateLatePenalty(calculateLateDays(12, 10))).toBe(20);

    expect(calculateLateDays(16, 10)).toBe(6);
    expect(calculateLatePenalty(calculateLateDays(16, 10))).toBe(60);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // R-21: Reputation Tier Boundaries
  // ─────────────────────────────────────────────────────────────────────────
  it("R-21: Precise tier boundary transitions (0/100, 101/400, 401/700, 701/900, 901/1000)", () => {
    // Tier 1: 0 - 100
    expect(getTierFromPoints(0).tier).toBe(1);
    expect(getTierFromPoints(100).tier).toBe(1);

    // Tier 2: 101 - 400
    expect(getTierFromPoints(101).tier).toBe(2);
    expect(getTierFromPoints(400).tier).toBe(2);

    // Tier 3: 401 - 700
    expect(getTierFromPoints(401).tier).toBe(3);
    expect(getTierFromPoints(700).tier).toBe(3);

    // Tier 4: 701 - 900
    expect(getTierFromPoints(701).tier).toBe(4);
    expect(getTierFromPoints(900).tier).toBe(4);

    // Tier 5: 901 - 1000
    expect(getTierFromPoints(901).tier).toBe(5);
    expect(getTierFromPoints(1000).tier).toBe(5);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // R-22: Reputation Clamping [0, 1000]
  // ─────────────────────────────────────────────────────────────────────────
  it("R-22: Reputation points strictly clamped between 0 and 1000", () => {
    expect(clampReputationPoints(-50)).toBe(0);
    expect(clampReputationPoints(0)).toBe(0);
    expect(clampReputationPoints(550)).toBe(550);
    expect(clampReputationPoints(1000)).toBe(1000);
    expect(clampReputationPoints(1500)).toBe(1000);
    expect(clampReputationPoints(NaN)).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // R-23: Join Pool Prerequisites (Username + Email Verified)
  // ─────────────────────────────────────────────────────────────────────────
  it("R-23: Join pool requires username and email verified", () => {
    const pool: PoolSnapshot = {
      mode: "AUCTION",
      minimumTier: 1,
      groupSize: 5,
      contributionAmountWei: 1000000000000000n,
      status: "ACTIVE",
    };

    // Missing username
    const resNoUsername = canJoinPool({
      user: {
        hasUsername: false,
        emailVerified: true,
        reputationPoint: 150,
        activeGroupCount: 0,
      },
      pool,
    });
    expect(resNoUsername.allowed).toBe(false);
    expect(resNoUsername.reason).toContain("username");

    // Missing email verification
    const resNoEmail = canJoinPool({
      user: {
        hasUsername: true,
        emailVerified: false,
        reputationPoint: 150,
        activeGroupCount: 0,
      },
      pool,
    });
    expect(resNoEmail.allowed).toBe(false);
    expect(resNoEmail.reason).toContain("email");

    // Valid user
    const resValid = canJoinPool({
      user: {
        hasUsername: true,
        emailVerified: true,
        reputationPoint: 150,
        activeGroupCount: 0,
      },
      pool,
    });
    expect(resValid.allowed).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // R-24: Active Group Limits Per Tier
  // ─────────────────────────────────────────────────────────────────────────
  it("R-24: Active group limits strictly match tier allocations (1/2/3/4/5)", () => {
    expect(TIERS[1].maxActiveGroups).toBe(1);
    expect(TIERS[2].maxActiveGroups).toBe(2);
    expect(TIERS[3].maxActiveGroups).toBe(3);
    expect(TIERS[4].maxActiveGroups).toBe(4);
    expect(TIERS[5].maxActiveGroups).toBe(5);

    const pool: PoolSnapshot = {
      mode: "BASIC",
      minimumTier: 1,
      groupSize: 3,
      contributionAmountWei: 1000000000000000n,
      status: "ACTIVE",
    };

    // Tier 2 user at limit (2 groups active)
    const atLimit = canJoinPool({
      user: {
        hasUsername: true,
        emailVerified: true,
        reputationPoint: 200, // Tier 2
        activeGroupCount: 2,
      },
      pool,
    });
    expect(atLimit.allowed).toBe(false);
    expect(atLimit.reason).toContain("maximum allowed active groups");

    // Tier 2 user under limit (1 group active)
    const underLimit = canJoinPool({
      user: {
        hasUsername: true,
        emailVerified: true,
        reputationPoint: 200, // Tier 2
        activeGroupCount: 1,
      },
      pool,
    });
    expect(underLimit.allowed).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // R-27: Duplicate txHash Rejected (Database & Conformance)
  // ─────────────────────────────────────────────────────────────────────────
  it("R-27: Duplicate txHash cannot be credited twice", async () => {
    // 1. Create two users
    const u1 = await mockPrisma.user.create({
      data: {
        walletAddress: "0x1111111111111111111111111111111111111111",
        profile: { create: { username: "user_r27_1", emailVerifiedAt: new Date() } },
        reputation: { create: { points: 200 } },
      },
    });
    const t1 = signJwt({ sub: u1.id, walletAddress: u1.walletAddress, role: u1.role });

    const u2 = await mockPrisma.user.create({
      data: {
        walletAddress: "0x2222222222222222222222222222222222222222",
        profile: { create: { username: "user_r27_2", emailVerifiedAt: new Date() } },
        reputation: { create: { points: 200 } },
      },
    });
    const t2 = signJwt({ sub: u2.id, walletAddress: u2.walletAddress, role: u2.role });

    const u3 = await mockPrisma.user.create({
      data: {
        walletAddress: "0x3333333333333333333333333333333333333333",
        profile: { create: { username: "user_r27_3", emailVerifiedAt: new Date() } },
        reputation: { create: { points: 200 } },
      },
    });
    const t3 = signJwt({ sub: u3.id, walletAddress: u3.walletAddress, role: u3.role });

    // Activate group in CIT-1
    await request(app).post("/api/pools/CIT-1/join").set("Authorization", `Bearer ${t1}`);
    await request(app).post("/api/pools/CIT-1/join").set("Authorization", `Bearer ${t2}`);
    const resJoin = await request(app).post("/api/pools/CIT-1/join").set("Authorization", `Bearer ${t3}`);
    const groupId = resJoin.body.groupId;

    const cycles = await mockPrisma.cycle.findMany({ where: { groupId } });
    const cycle1Id = cycles[0].id;

    // User 1 confirms with txHash
    const res1 = await request(app)
      .post("/api/contributions/confirm")
      .set("Authorization", `Bearer ${t1}`)
      .send({
        cycleId: cycle1Id,
        txHash: "0xshared_r27_tx",
      });
    expect(res1.status).toBe(200);

    // User 2 tries confirming with SAME txHash
    const res2 = await request(app)
      .post("/api/contributions/confirm")
      .set("Authorization", `Bearer ${t2}`)
      .send({
        cycleId: cycle1Id,
        txHash: "0xshared_r27_tx",
      });

    expect(res2.status).toBe(400);
    expect(res2.body.error).toHaveProperty("code", "TX_HASH_DUPLICATE");
  });
});
