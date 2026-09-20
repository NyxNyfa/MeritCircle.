import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { mockPrisma, resetMockDb } from "./mock-prisma";

// Mock the Prisma client module
vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";

describe("Phase 09 - Auth Module", () => {
  const testAccount = privateKeyToAccount(generatePrivateKey());
  const walletAddress = testAccount.address;

  beforeEach(() => {
    resetMockDb();
    vi.clearAllMocks();
  });

  it("POST /api/auth/nonce returns random nonce with expiry", async () => {
    const res = await request(app)
      .post("/api/auth/nonce")
      .send({ walletAddress });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("nonce");
    expect(res.body).toHaveProperty("walletAddress", walletAddress);
    expect(res.body).toHaveProperty("expiresAt");
    expect(typeof res.body.nonce).toBe("string");
  });

  it("POST /api/auth/verify rejects non-existent or invalid nonce", async () => {
    const signature = await testAccount.signMessage({ message: "fake-nonce" });
    const res = await request(app).post("/api/auth/verify").send({
      walletAddress,
      nonce: "fake-nonce",
      signature,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired nonce/i);
  });

  it("POST /api/auth/verify rejects invalid signature", async () => {
    // 1. Get real nonce
    const nonceRes = await request(app)
      .post("/api/auth/nonce")
      .send({ walletAddress });
    const { nonce } = nonceRes.body;

    // 2. Sign a DIFFERENT message
    const badSignature = await testAccount.signMessage({
      message: "different message",
    });

    // 3. Verify
    const res = await request(app).post("/api/auth/verify").send({
      walletAddress,
      nonce,
      signature: badSignature,
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("POST /api/auth/verify accepts valid signature, creates user, awards WALLET_CONNECTED, and returns JWT", async () => {
    // 1. Request nonce
    const nonceRes = await request(app)
      .post("/api/auth/nonce")
      .send({ walletAddress });
    const { nonce } = nonceRes.body;

    // 2. Sign exact nonce with test account
    const signature = await testAccount.signMessage({ message: nonce });

    // 3. Verify
    const res = await request(app).post("/api/auth/verify").send({
      walletAddress,
      nonce,
      signature,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user.walletAddress.toLowerCase()).toBe(
      walletAddress.toLowerCase()
    );
    expect(res.body.user.role).toBe("USER");

    // Check user was created in db with profile and reputation
    const dbUser = await mockPrisma.user.findUnique({
      where: { walletAddress },
      include: { profile: true, reputation: true },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser.reputation.points).toBe(10); // WALLET_CONNECTED +10
  });

  it("POST /api/auth/verify rejects reused nonce (single-use)", async () => {
    const nonceRes = await request(app)
      .post("/api/auth/nonce")
      .send({ walletAddress });
    const { nonce } = nonceRes.body;
    const signature = await testAccount.signMessage({ message: nonce });

    // First use: success
    const res1 = await request(app).post("/api/auth/verify").send({
      walletAddress,
      nonce,
      signature,
    });
    expect(res1.status).toBe(200);

    // Second use: fails because nonce was consumed
    const res2 = await request(app).post("/api/auth/verify").send({
      walletAddress,
      nonce,
      signature,
    });
    expect(res2.status).toBe(400);
  });

  it("GET /api/auth/session returns user with valid token", async () => {
    // 1. Login
    const nonceRes = await request(app)
      .post("/api/auth/nonce")
      .send({ walletAddress });
    const { nonce } = nonceRes.body;
    const signature = await testAccount.signMessage({ message: nonce });
    const authRes = await request(app).post("/api/auth/verify").send({
      walletAddress,
      nonce,
      signature,
    });
    const token = authRes.body.token;

    // 2. Query session
    const sessionRes = await request(app)
      .get("/api/auth/session")
      .set("Authorization", `Bearer ${token}`);

    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.user).toHaveProperty("id");
    expect(sessionRes.body.user.walletAddress.toLowerCase()).toBe(
      walletAddress.toLowerCase()
    );
  });

  it("GET /api/auth/session rejects missing or invalid token", async () => {
    const noTokenRes = await request(app).get("/api/auth/session");
    expect(noTokenRes.status).toBe(401);

    const badTokenRes = await request(app)
      .get("/api/auth/session")
      .set("Authorization", "Bearer invalid-jwt-token");
    expect(badTokenRes.status).toBe(401);
  });

  it("POST /api/auth/logout returns success", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
