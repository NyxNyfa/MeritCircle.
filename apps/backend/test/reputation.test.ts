import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { ReputationEventType } from "@prisma/client";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";
import { applyReputationEvent } from "../src/modules/reputation/reputation.service";

describe("Phase 09 - Reputation Module", () => {
  let userId: string;
  let token: string;

  beforeEach(async () => {
    resetMockDb();

    const u = await mockPrisma.user.create({
      data: {
        walletAddress: "0x4444444444444444444444444444444444444444",
        profile: { create: {} },
        reputation: { create: { points: 0, tier: 1 } },
      },
      include: { profile: true, reputation: true },
    });
    userId = u.id;
    token = signJwt({
      sub: u.id,
      walletAddress: u.walletAddress,
      role: u.role,
    });
  });

  it("GET /api/reputation/me requires auth", async () => {
    const res = await request(app).get("/api/reputation/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/reputation/me returns points, tier, and nextTierPoints", async () => {
    const res = await request(app)
      .get("/api/reputation/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      points: 0,
      tier: 1,
      tierName: "Newcomer",
      maxActiveGroups: 1,
      nextTierPoints: 101,
    });
  });

  it("Reputation clamps below 0", async () => {
    // Apply large negative penalty
    await applyReputationEvent({
      userId,
      type: ReputationEventType.CONTRIBUTION_LATE,
      points: -50,
      reason: "Late contribution penalty",
    });

    const res = await request(app)
      .get("/api/reputation/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.points).toBe(0); // Clamped at 0
    expect(res.body.tier).toBe(1);
  });

  it("Reputation clamps above 1000 and calculates Prime Tier 5", async () => {
    // Apply large positive points exceeding 1000
    await applyReputationEvent({
      userId,
      type: ReputationEventType.GROUP_COMPLETED,
      points: 1500,
      reason: "Multiple cycles completed",
    });

    const res = await request(app)
      .get("/api/reputation/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.points).toBe(1000); // Clamped at 1000
    expect(res.body.tier).toBe(5);
    expect(res.body.tierName).toBe("Prime");
    expect(res.body.maxActiveGroups).toBe(5);
    expect(res.body.nextTierPoints).toBeNull(); // Already max tier
  });

  it("GET /api/reputation/me/history records and returns audit trail", async () => {
    await applyReputationEvent({
      userId,
      type: ReputationEventType.WALLET_CONNECTED,
      points: 10,
      reason: "Wallet connected",
    });

    await applyReputationEvent({
      userId,
      type: ReputationEventType.USERNAME_SET,
      points: 10,
      reason: "Username configured",
    });

    const res = await request(app)
      .get("/api/reputation/me/history")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(2);
    expect(res.body.events[0].type).toBe("USERNAME_SET");
    expect(res.body.events[1].type).toBe("WALLET_CONNECTED");
  });

  it("Tier progression matches domain rules across tiers", async () => {
    // 150 points -> Tier 2 (Citizen, 101-400)
    await applyReputationEvent({
      userId,
      type: ReputationEventType.GROUP_COMPLETED,
      points: 150,
      reason: "Test Tier 2",
    });
    let res = await request(app)
      .get("/api/reputation/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.tier).toBe(2);
    expect(res.body.tierName).toBe("Citizen");
    expect(res.body.nextTierPoints).toBe(401);

    // +300 points = 450 -> Tier 3 (Builder, 401-700)
    await applyReputationEvent({
      userId,
      type: ReputationEventType.GROUP_COMPLETED,
      points: 300,
      reason: "Test Tier 3",
    });
    res = await request(app)
      .get("/api/reputation/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.tier).toBe(3);
    expect(res.body.tierName).toBe("Builder");
    expect(res.body.nextTierPoints).toBe(701);

    // +300 points = 750 -> Tier 4 (Trusted, 701-900)
    await applyReputationEvent({
      userId,
      type: ReputationEventType.GROUP_COMPLETED,
      points: 300,
      reason: "Test Tier 4",
    });
    res = await request(app)
      .get("/api/reputation/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.tier).toBe(4);
    expect(res.body.tierName).toBe("Trusted");
    expect(res.body.nextTierPoints).toBe(901);
  });
});
