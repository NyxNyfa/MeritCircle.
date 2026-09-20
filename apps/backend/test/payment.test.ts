import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";
import { confirmPayment } from "../src/modules/payments/payment.service";

describe("Phase 10 - Payment Intent & Confirmation Service", () => {
  let user1: any;
  let token1: string;
  let user2: any;
  let token2: string;
  let cycle1Id: string;
  let contribution1Id: string;
  let groupId: string;

  beforeEach(async () => {
    resetMockDb();

    // 1. Create 3 users and activate group
    const users = [];
    const tokens = [];
    for (let i = 1; i <= 3; i++) {
      const u = await mockPrisma.user.create({
        data: {
          walletAddress: `0x${i.toString(16).padStart(2, "0").repeat(20)}`,
          profile: {
            create: {
              username: `payer_${i}`,
              email: `payer_${i}@example.com`,
              emailVerifiedAt: new Date(),
            },
          },
          reputation: {
            create: {
              points: 200,
              tier: 2,
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

    // Join all 3 to CIT-1 -> Activates group
    await request(app).post("/api/pools/CIT-1/join").set("Authorization", `Bearer ${tokens[0]}`);
    await request(app).post("/api/pools/CIT-1/join").set("Authorization", `Bearer ${tokens[1]}`);
    const resJoin = await request(app).post("/api/pools/CIT-1/join").set("Authorization", `Bearer ${tokens[2]}`);
    groupId = resJoin.body.groupId;

    const cycles = await mockPrisma.cycle.findMany({ where: { groupId } });
    cycle1Id = cycles[0].id;

    const contr = await mockPrisma.contribution.findFirst({
      where: { cycleId: cycle1Id, userId: user1.id },
    });
    contribution1Id = contr.id;
  });

  it("payment intent requires auth", async () => {
    const res = await request(app).post(`/api/cycles/${cycle1Id}/payment-intent`);
    expect(res.status).toBe(401);
  });

  it("payment intent requires group membership", async () => {
    // External user not in group
    const extUser = await mockPrisma.user.create({
      data: {
        walletAddress: "0x9999999999999999999999999999999999999999",
        profile: { create: { username: "outsider", emailVerifiedAt: new Date() } },
        reputation: { create: { points: 100 } },
      },
    });
    const extToken = signJwt({ sub: extUser.id, walletAddress: extUser.walletAddress, role: "USER" });

    const res = await request(app)
      .post(`/api/cycles/${cycle1Id}/payment-intent`)
      .set("Authorization", `Bearer ${extToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
  });

  it("payment intent returns instructions and expected contribution amount", async () => {
    const res = await request(app)
      .post(`/api/cycles/${cycle1Id}/payment-intent`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("cycleId", cycle1Id);
    expect(res.body).toHaveProperty("contributionId", contribution1Id);
    expect(res.body).toHaveProperty("contributionAmountWei", "1000000000000000");
    expect(res.body).toHaveProperty("paymentMethod", "BNB_TESTNET");
    expect(res.body.instructions).toMatch(/payContribution/i);
  });

  it("payment intent rejects completed cycle", async () => {
    await mockPrisma.cycle.update({
      where: { id: cycle1Id },
      data: { status: "COMPLETED" },
    });

    const res = await request(app)
      .post(`/api/cycles/${cycle1Id}/payment-intent`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "CYCLE_NOT_PAYABLE");
  });

  it("payment confirm requires auth", async () => {
    const res = await request(app).post("/api/contributions/confirm").send({
      cycleId: cycle1Id,
      txHash: "0xabc123",
    });
    expect(res.status).toBe(401);
  });

  it("payment confirm rejects failed blockchain verification", async () => {
    const res = await request(app)
      .post("/api/contributions/confirm")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        cycleId: cycle1Id,
        txHash: "invalid-tx-hash",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "PAYMENT_VERIFICATION_FAILED");
  });

  it("payment confirm on-time: marks PAID_ON_TIME, awards +50 (and +10 early bonus if <3 days), and logs ContractTransaction", async () => {
    const res = await request(app)
      .post("/api/contributions/confirm")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        cycleId: cycle1Id,
        txHash: "0xvalidtx1",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PAID_ON_TIME");
    expect(res.body.lateDays).toBe(0);
    expect(res.body.penaltyPoint).toBe(0);
    expect(res.body.rewardPoint).toBe(50);

    // Verify DB update
    const contr = await mockPrisma.contribution.findUnique({
      where: { id: contribution1Id },
    });
    expect(contr.status).toBe("PAID_ON_TIME");
    expect(contr.txHash).toBe("0xvalidtx1");

    // Verify ContractTransaction created
    const tx = await mockPrisma.contractTransaction.findUnique({
      where: { txHash: "0xvalidtx1" },
    });
    expect(tx).not.toBeNull();
    expect(tx.status).toBe("CONFIRMED");

    // Verify reputation increased (200 + 50 + 10 early bonus = 260)
    const rep = await mockPrisma.reputation.findUnique({
      where: { userId: user1.id },
    });
    expect(rep.points).toBe(260);
  });

  it("payment confirm is idempotent for same contribution and same txHash", async () => {
    // 1st confirmation
    const res1 = await request(app)
      .post("/api/contributions/confirm")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        cycleId: cycle1Id,
        txHash: "0xidempotent_tx",
      });
    expect(res1.status).toBe(200);

    // 2nd confirmation: returns existing result without error or duplicate points
    const res2 = await request(app)
      .post("/api/contributions/confirm")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        cycleId: cycle1Id,
        txHash: "0xidempotent_tx",
      });
    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe("PAID_ON_TIME");

    // Points awarded only once
    const rep = await mockPrisma.reputation.findUnique({
      where: { userId: user1.id },
    });
    expect(rep.points).toBe(260);
  });

  it("payment confirm rejects duplicate txHash for another contribution", async () => {
    // User 1 confirms with txHash
    await request(app)
      .post("/api/contributions/confirm")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        cycleId: cycle1Id,
        txHash: "0xshared_tx",
      });

    // User 2 tries confirming with SAME txHash
    const res2 = await request(app)
      .post("/api/contributions/confirm")
      .set("Authorization", `Bearer ${token2}`)
      .send({
        cycleId: cycle1Id,
        txHash: "0xshared_tx",
      });

    expect(res2.status).toBe(400);
    expect(res2.body.error).toHaveProperty("code", "TX_HASH_DUPLICATE");
  });

  it("payment confirm late payment: marks PAID_LATE, applies domain penalty formula, and awards no reward", async () => {
    // Find User 2 contribution
    const c2 = await mockPrisma.contribution.findFirst({
      where: { cycleId: cycle1Id, userId: user2.id },
    });

    // Simulate payment 5 days AFTER paymentDeadline
    const deadline = c2.dueDate || new Date();
    const latePaymentTime = new Date(deadline.getTime() + 5 * 24 * 60 * 60 * 1000);

    const result = await confirmPayment(
      user2.id,
      {
        contributionId: c2.id,
        txHash: "0xlate_tx",
      },
      latePaymentTime
    );

    expect(result.status).toBe("PAID_LATE");
    expect(result.lateDays).toBe(5);
    expect(result.penaltyPoint).toBe(50); // 5 days * 10 = 50 penalty
    expect(result.rewardPoint).toBe(0);

    // Verify reputation deducted (200 - 50 = 150)
    const rep = await mockPrisma.reputation.findUnique({
      where: { userId: user2.id },
    });
    expect(rep.points).toBe(150);
  });
});
