import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 09 - Profile Module", () => {
  let userId1: string;
  let userId2: string;
  let token1: string;
  let token2: string;

  beforeEach(async () => {
    resetMockDb();

    // Seed test users
    const u1 = await mockPrisma.user.create({
      data: {
        walletAddress: "0x1111111111111111111111111111111111111111",
        profile: { create: {} },
        reputation: { create: { points: 0, tier: 1 } },
      },
      include: { profile: true, reputation: true },
    });
    userId1 = u1.id;
    token1 = signJwt({
      sub: u1.id,
      walletAddress: u1.walletAddress,
      role: u1.role,
    });

    const u2 = await mockPrisma.user.create({
      data: {
        walletAddress: "0x2222222222222222222222222222222222222222",
        profile: { create: {} },
        reputation: { create: { points: 0, tier: 1 } },
      },
      include: { profile: true, reputation: true },
    });
    userId2 = u2.id;
    token2 = signJwt({
      sub: u2.id,
      walletAddress: u2.walletAddress,
      role: u2.role,
    });
  });

  it("GET /api/profile requires auth", async () => {
    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(401);
  });

  it("GET /api/profile returns profile data for authenticated user", async () => {
    const res = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("walletAddress");
    expect(res.body.username).toBeNull();
    expect(res.body.email).toBeNull();
    expect(res.body.emailVerifiedAt).toBeNull();
  });

  it("PATCH /api/profile requires auth", async () => {
    const res = await request(app)
      .patch("/api/profile")
      .send({ username: "alice_crypto" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/profile updates username and awards USERNAME_SET (+10)", async () => {
    const res = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token1}`)
      .send({ username: "alice_crypto" });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("alice_crypto");

    // Check reputation award (+10)
    const rep = await mockPrisma.reputation.findUnique({
      where: { userId: userId1 },
    });
    expect(rep.points).toBe(10);
  });

  it("PATCH /api/profile rejects invalid username format", async () => {
    // Too short (<3)
    const res1 = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token1}`)
      .send({ username: "al" });
    expect(res1.status).toBe(400);

    // Invalid characters
    const res2 = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token1}`)
      .send({ username: "alice with spaces!" });
    expect(res2.status).toBe(400);
  });

  it("PATCH /api/profile rejects duplicate username", async () => {
    // User 1 sets username
    await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token1}`)
      .send({ username: "satoshi" });

    // User 2 tries setting same username
    const res = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token2}`)
      .send({ username: "satoshi" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username is already taken/i);
  });

  it("PATCH /api/profile updates email and rejects duplicate email", async () => {
    // User 1 sets email
    const res1 = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token1}`)
      .send({ email: "user1@example.com" });
    expect(res1.status).toBe(200);
    expect(res1.body.email).toBe("user1@example.com");

    // User 2 tries setting same email
    const res2 = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token2}`)
      .send({ email: "user1@example.com" });
    expect(res2.status).toBe(409);
    expect(res2.body.error).toMatch(/email is already registered/i);
  });

  it("PATCH /api/profile resets emailVerifiedAt when email changes", async () => {
    // Manually mark user 1 email verified
    await mockPrisma.profile.update({
      where: { userId: userId1 },
      data: {
        email: "old@example.com",
        emailVerifiedAt: new Date(),
      },
    });

    const verifyCheck = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${token1}`);
    expect(verifyCheck.body.emailVerifiedAt).not.toBeNull();

    // Now update email
    const updateRes = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token1}`)
      .send({ email: "new@example.com" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.email).toBe("new@example.com");
    expect(updateRes.body.emailVerifiedAt).toBeNull();
  });

  it("PATCH /api/profile does not award duplicate one-time reputation events", async () => {
    // 1st update: username set -> +10
    await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token1}`)
      .send({ username: "alice_1" });

    const rep1 = await mockPrisma.reputation.findUnique({
      where: { userId: userId1 },
    });
    expect(rep1.points).toBe(10);

    // 2nd update: username changed to alice_2 -> should NOT award +10 again
    await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token1}`)
      .send({ username: "alice_2" });

    const rep2 = await mockPrisma.reputation.findUnique({
      where: { userId: userId1 },
    });
    expect(rep2.points).toBe(10);
  });
});
