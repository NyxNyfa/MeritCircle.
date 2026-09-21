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
    const { resetEmailRateLimits } = await import(
      "../src/modules/email/email.service"
    );
    resetEmailRateLimits();

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
    const err = typeof res.body.error === "string" ? res.body.error : res.body.error?.message;
    expect(err).toMatch(/email is not set/i);
    expect(res.body.error?.code || res.body.code).toBe("EMAIL_NOT_SET");
  });

  it("POST /api/email/verify/request accepts email in body even if profile email is not set", async () => {
    const res = await request(app)
      .post("/api/email/verify/request")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "newuser@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.expiresInMinutes).toBe(10);
    expect(res.body).toHaveProperty("devCode");

    const dbState = (await import("./mock-prisma")).dbState;
    const profile = dbState.profiles.get(userId);
    expect(profile?.email).toBe("newuser@example.com");
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

  it("POST /api/email/verify/request enforces rate limiting after 5 requests", async () => {
    await mockPrisma.profile.update({
      where: { userId },
      data: { email: "ratelimit@example.com" },
    });

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/email/verify/request")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    }

    const blockedRes = await request(app)
      .post("/api/email/verify/request")
      .set("Authorization", `Bearer ${token}`);
    expect(blockedRes.status).toBe(429);
    const err = typeof blockedRes.body.error === "string" ? blockedRes.body.error : blockedRes.body.error?.message;
    expect(err).toMatch(/too many verification requests/i);
    expect(blockedRes.body.error?.code || blockedRes.body.code).toBe("RATE_LIMITED");
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
    const err = typeof confirmRes.body.error === "string" ? confirmRes.body.error : confirmRes.body.error?.message;
    expect(err).toMatch(/invalid/i);
    expect(confirmRes.body.error?.code || confirmRes.body.code).toBe("INVALID_CODE");
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
    const err = typeof res2.body.error === "string" ? res2.body.error : res2.body.error?.message;
    expect(err).toMatch(/already been used/i);
    expect(res2.body.error?.code || res2.body.code).toBe("CODE_ALREADY_USED");
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
    const err = typeof confirmRes.body.error === "string" ? confirmRes.body.error : confirmRes.body.error?.message;
    expect(err).toMatch(/expired/i);
    expect(confirmRes.body.error?.code || confirmRes.body.code).toBe("CODE_EXPIRED");
  });

  describe("ResendEmailProvider", () => {
    it("sends email via Resend API fetch with correct payload", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "email_123" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { ResendEmailProvider } = await import(
        "../src/modules/email/email.provider"
      );
      const provider = new ResendEmailProvider(
        "re_test_key_123",
        "Merit Circle <test@meritcircle.local>"
      );
      await provider.sendVerificationEmail({
        to: "recipient@example.com",
        code: "654321",
        expiresAt: new Date(Date.now() + 600000),
      });

      expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer re_test_key_123",
          "Content-Type": "application/json",
        },
        body: expect.stringContaining("654321"),
      });

      vi.unstubAllGlobals();
    });

    it("throws error when Resend API returns error response", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: "API key invalid" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { ResendEmailProvider } = await import(
        "../src/modules/email/email.provider"
      );
      const provider = new ResendEmailProvider("re_bad_key");
      await expect(
        provider.sendVerificationEmail({
          to: "recipient@example.com",
          code: "123456",
          expiresAt: new Date(),
        })
      ).rejects.toThrow(/API key invalid/i);

      vi.unstubAllGlobals();
    });
  });
});

