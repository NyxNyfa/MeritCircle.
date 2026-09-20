import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 10 - Cycle Creation & Contribution Schedule", () => {
  beforeEach(() => {
    resetMockDb();
  });

  async function createTierUser(idx: number, tier: number, points: number) {
    const hexIdx = idx.toString(16).padStart(2, "0");
    const wallet = `0x${hexIdx.repeat(20)}`;
    const user = await mockPrisma.user.create({
      data: {
        walletAddress: wallet,
        profile: {
          create: {
            username: `user_${idx}`,
            email: `user_${idx}@example.com`,
            emailVerifiedAt: new Date(),
          },
        },
        reputation: {
          create: {
            points,
            tier,
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

  it("BASIC pool: creates cycles with 30-day intervals, 10-day payment deadline, null auction dates, and schedules contributions", async () => {
    const u1 = await createTierUser(1, 2, 200);
    const u2 = await createTierUser(2, 2, 200);
    const u3 = await createTierUser(3, 2, 200);

    await request(app).post("/api/pools/CIT-1/join").set("Authorization", `Bearer ${u1.token}`);
    await request(app).post("/api/pools/CIT-1/join").set("Authorization", `Bearer ${u2.token}`);
    const res3 = await request(app).post("/api/pools/CIT-1/join").set("Authorization", `Bearer ${u3.token}`);

    const groupId = res3.body.groupId;

    // Fetch group cycles via endpoint
    const cyclesRes = await request(app)
      .get(`/api/groups/${groupId}/cycles`)
      .set("Authorization", `Bearer ${u1.token}`);

    expect(cyclesRes.status).toBe(200);
    const cycles = cyclesRes.body.cycles;
    expect(cycles.length).toBe(3);

    // Cycle 1 checks
    const c1 = cycles[0];
    expect(c1.cycleNumber).toBe(1);
    expect(c1.status).toBe("PAYMENT_OPEN");
    expect(c1.isFinalCycle).toBe(false);
    expect(c1.auctionOpenAt).toBeNull();
    expect(c1.auctionCloseAt).toBeNull();

    // Check 10-day payment window
    const c1Start = new Date(c1.startDate).getTime();
    const c1Deadline = new Date(c1.paymentDeadline).getTime();
    const c1Settlement = new Date(c1.settlementAt).getTime();
    expect(c1Deadline - c1Start).toBe(10 * 24 * 60 * 60 * 1000);
    expect(c1Settlement - c1Start).toBe(30 * 24 * 60 * 60 * 1000);

    // Final cycle check (Cycle 3)
    const c3 = cycles[2];
    expect(c3.cycleNumber).toBe(3);
    expect(c3.isFinalCycle).toBe(true);
    expect(c3.status).toBe("UPCOMING");

    // Check contributions: exactly 1 per user per cycle
    const user1Contributions = await mockPrisma.contribution.findMany({
      where: { userId: u1.user.id, groupId },
    });
    expect(user1Contributions.length).toBe(3);
    for (const c of user1Contributions) {
      expect(c.status).toBe("PENDING");
      expect(c.amountWei).toBe("1000000000000000");
    }
  });

  it("AUCTION pool: populates auctionOpenAt and auctionCloseAt dates based on pool configuration", async () => {
    // TRUST-1 is AUCTION mode, minimumTier = 4 (e.g. 750 points)
    const u1 = await createTierUser(10, 4, 750);
    const u2 = await createTierUser(11, 4, 750);
    const u3 = await createTierUser(12, 4, 750);

    await request(app).post("/api/pools/TRUST-1/join").set("Authorization", `Bearer ${u1.token}`);
    await request(app).post("/api/pools/TRUST-1/join").set("Authorization", `Bearer ${u2.token}`);
    const res3 = await request(app).post("/api/pools/TRUST-1/join").set("Authorization", `Bearer ${u3.token}`);

    const groupId = res3.body.groupId;
    const cyclesRes = await request(app)
      .get(`/api/groups/${groupId}/cycles`)
      .set("Authorization", `Bearer ${u1.token}`);

    expect(cyclesRes.status).toBe(200);
    const c1 = cyclesRes.body.cycles[0];

    expect(c1.auctionOpenAt).not.toBeNull();
    expect(c1.auctionCloseAt).not.toBeNull();

    const startMs = new Date(c1.startDate).getTime();
    const openMs = new Date(c1.auctionOpenAt).getTime();
    const closeMs = new Date(c1.auctionCloseAt).getTime();

    // pool.auctionOpenDay = 11, pool.auctionCloseDay = 25
    expect(openMs - startMs).toBe(11 * 24 * 60 * 60 * 1000);
    expect(closeMs - startMs).toBe(25 * 24 * 60 * 60 * 1000);
  });
});
