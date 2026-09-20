import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 09 - Email Verification Module", () => {
  let userId: string;
  let token: string;

  beforeEach(async () => {
    resetMockDb();

    const u = await mockPrisma.user.create({
      data: {
        walletAddress: "0x3333333333333333333333333333333333333333",
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

  it("POST /api/email/verify/request requires auth", async () => {
    const res = await request(app).post("/api/email/verify/request");
    expect(res.status).toBe(401);
  });

  it("POST /api/email/verify/request fails if email is not set in profile", async () => {
    const res = await request(app)
      .post("/api/email/verify/request")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email is not set/i);
  });

  it("POST /api/email/verify/request creates hashed verification record (no plaintext)", async () => {
    // Set email
    await mockPrisma.profile.update({
      where: { userId },
      data: { email: "test@example.com" },
    });

    const res = await request(app)
      .post("/api/email/verify/request")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.expiresInMinutes).toBe(10);
    expect(res.body).toHaveProperty("devCode"); // devCode available in test/dev

    const storedList = mockPrisma.emailVerification;
    const records = (mockPrisma as any).emailVerification;
    // Inspect directly from dbState
    const dbState = (await import("./mock-prisma")).dbState;
    expect(dbState.emailVerifications.length).toBe(1);
    const ver = dbState.emailVerifications[0];
    expect(ver.otpHash).not.toBe(res.body.devCode); // Must be hashed, not plaintext!
    expect(ver.otpHash).toHaveLength(64); // SHA-256 hex
  });

  it("POST /api/email/verify/confirm rejects wrong code", async () => {
    await mockPrisma.profile.update({
      where: { userId },
      data: { email: "test@example.com" },
    });

    await request(app)
      .post("/api/email/verify/request")
      .set("Authorization", `Bearer ${token}`);

    const confirmRes = await request(app)
      .post("/api/email/verify/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "000000" });

    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.error).toMatch(/invalid/i);
  });

  it("POST /api/email/verify/confirm verifies email and awards EMAIL_VERIFIED (+40)", async () => {
    await mockPrisma.profile.update({
      where: { userId },
      data: { email: "verify_me@example.com" },
    });

    const reqRes = await request(app)
      .post("/api/email/verify/request")
      .set("Authorization", `Bearer ${token}`);
    const code = reqRes.body.devCode;

    const confirmRes = await request(app)
      .post("/api/email/verify/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ code });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.emailVerified).toBe(true);

    // Profile should show emailVerifiedAt set
    const profile = await mockPrisma.profile.findUnique({ where: { userId } });
    expect(profile.emailVerifiedAt).not.toBeNull();

    // Reputation points should include +40
    const rep = await mockPrisma.reputation.findUnique({ where: { userId } });
    expect(rep.points).toBe(40);
  });

  it("POST /api/email/verify/confirm rejects reused code", async () => {
    await mockPrisma.profile.update({
      where: { userId },
      data: { email: "verify_me2@example.com" },
    });

    const reqRes = await request(app)
      .post("/api/email/verify/request")
      .set("Authorization", `Bearer ${token}`);
    const code = reqRes.body.devCode;

    // 1st confirm: success
    const res1 = await request(app)
      .post("/api/email/verify/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ code });
    expect(res1.status).toBe(200);

    // 2nd confirm: rejects reused
    const res2 = await request(app)
      .post("/api/email/verify/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ code });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/already been used/i);
  });

  it("POST /api/email/verify/confirm rejects expired code", async () => {
    const dbState = (await import("./mock-prisma")).dbState;
    await mockPrisma.profile.update({
      where: { userId },
      data: { email: "expired@example.com" },
    });

    const reqRes = await request(app)
      .post("/api/email/verify/request")
      .set("Authorization", `Bearer ${token}`);
    const code = reqRes.body.devCode;

    // Manually mutate expiration to past date
    dbState.emailVerifications[0].expiresAt = new Date(Date.now() - 10000);

    const confirmRes = await request(app)
      .post("/api/email/verify/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ code });

    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.error).toMatch(/expired/i);
  });
});
