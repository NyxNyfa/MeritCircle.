import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 10 - Join Pool Eligibility & Validation", () => {
  beforeEach(() => {
    resetMockDb();
  });

  async function createTestUser(opts: {
    username?: string | null;
    emailVerified?: boolean;
    points?: number;
    walletAddress?: string;
  }) {
    const wallet = opts.walletAddress || "0x1111111111111111111111111111111111111111";
    const user = await mockPrisma.user.create({
      data: {
        walletAddress: wallet,
        profile: {
          create: {
            username: opts.username !== undefined ? opts.username : "valid_user",
            email: "user@example.com",
            emailVerifiedAt: opts.emailVerified ? new Date() : null,
          },
        },
        reputation: {
          create: {
            points: opts.points !== undefined ? opts.points : 150, // Tier 2 default
            tier: 2,
          },
        },
      },
      include: { profile: true, reputation: true },
    });

    const token = signJwt({
      sub: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
    });

    return { user, token };
  }

  it("rejects unauthenticated join", async () => {
    const res = await request(app).post("/api/pools/CIT-1/join");
    expect(res.status).toBe(401);
  });

  it("rejects join when username is missing", async () => {
    const { token } = await createTestUser({ username: null, emailVerified: true });
    const res = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "USERNAME_MISSING");
  });

  it("rejects join when email is not verified", async () => {
    const { token } = await createTestUser({
      username: "alice",
      emailVerified: false,
    });
    const res = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "EMAIL_NOT_VERIFIED");
  });

  it("rejects join when user tier is insufficient for the pool", async () => {
    // TRUST-1 requires Tier 4 (701-900 points). User has 150 points (Tier 2).
    const { token } = await createTestUser({
      username: "alice",
      emailVerified: true,
      points: 150,
    });
    const res = await request(app)
      .post("/api/pools/TRUST-1/join")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty("code", "TIER_INSUFFICIENT");
  });

  it("rejects join when active group limit is reached for user tier", async () => {
    // User at Tier 2 has maxActiveGroups = 2
    const { user, token } = await createTestUser({
      username: "active_user",
      emailVerified: true,
      points: 200,
    });

    // Create 2 active groups user already belongs to
    const g1 = await mockPrisma.group.create({
      data: { poolId: "dummy_1", groupNumber: 1, status: "ACTIVE", memberCount: 3 },
    });
    await mockPrisma.groupMember.create({
      data: { groupId: g1.id, userId: user.id, payoutSlot: 1 },
    });

    const g2 = await mockPrisma.group.create({
      data: { poolId: "dummy_2", groupNumber: 1, status: "FORMING", memberCount: 1 },
    });
    await mockPrisma.groupMember.create({
      data: { groupId: g2.id, userId: user.id, payoutSlot: 1 },
    });

    const res = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "ACTIVE_GROUP_LIMIT_REACHED");
  });

  it("rejects join for inactive pool", async () => {
    const inactivePool = await mockPrisma.pool.create({
      data: {
        externalPoolId: "INACT-1",
        name: "Inactive Pool",
        mode: "BASIC",
        minimumTier: 1,
        groupSize: 3,
        cycleCount: 3,
        contributionAmountWei: "1000000000000000",
        status: "INACTIVE",
      },
    });

    const { token } = await createTestUser({
      username: "bob",
      emailVerified: true,
      points: 150,
    });

    const res = await request(app)
      .post(`/api/pools/${inactivePool.id}/join`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "POOL_INACTIVE");
  });

  it("rejects join if user is already in a forming or active group in the same pool", async () => {
    const { user, token } = await createTestUser({
      username: "alice",
      emailVerified: true,
      points: 250,
    });

    // First join: success
    const res1 = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${token}`);
    expect(res1.status).toBe(200);

    // Second join to same pool: rejected
    const res2 = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${token}`);

    expect(res2.status).toBe(400);
    expect(res2.body.error).toHaveProperty("code", "ALREADY_IN_POOL_GROUP");
  });

  it("allows valid join with appropriate tier and verified profile", async () => {
    const { token } = await createTestUser({
      username: "valid_alice",
      emailVerified: true,
      points: 250,
    });

    const res = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("groupId");
    expect(res.body).toHaveProperty("groupStatus");
    expect(res.body).toHaveProperty("slot", 1);
    expect(res.body).toHaveProperty("groupSize", 3);
  });
});
