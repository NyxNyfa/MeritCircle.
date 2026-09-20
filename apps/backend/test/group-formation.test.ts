import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 10 - Group Formation & Activation Lifecycle", () => {
  beforeEach(() => {
    resetMockDb();
  });

  async function createVerifiedUser(idx: number) {
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
            points: 250, // Tier 2
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

  it("group formation lifecycle: user1 creates group, user2 joins, user3 activates, user4 creates next group", async () => {
    const u1 = await createVerifiedUser(1);
    const u2 = await createVerifiedUser(2);
    const u3 = await createVerifiedUser(3);
    const u4 = await createVerifiedUser(4);

    // 1. User 1 joins -> creates new FORMING group #1
    const res1 = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${u1.token}`);
    expect(res1.status).toBe(200);
    expect(res1.body.slot).toBe(1);
    expect(res1.body.groupStatus).toBe("FORMING");
    expect(res1.body.groupWillBecomeActive).toBe(false);
    const groupId1 = res1.body.groupId;

    // 2. User 2 joins -> joins existing FORMING group #1
    const res2 = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${u2.token}`);
    expect(res2.status).toBe(200);
    expect(res2.body.groupId).toBe(groupId1);
    expect(res2.body.slot).toBe(2);
    expect(res2.body.groupStatus).toBe("FORMING");
    expect(res2.body.groupWillBecomeActive).toBe(false);

    // 3. User 3 joins -> completes group (size 3) -> group becomes ACTIVE!
    const res3 = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${u3.token}`);
    expect(res3.status).toBe(200);
    expect(res3.body.groupId).toBe(groupId1);
    expect(res3.body.slot).toBe(3);
    expect(res3.body.groupStatus).toBe("ACTIVE");
    expect(res3.body.groupWillBecomeActive).toBe(true);

    // Verify group in DB is ACTIVE
    const dbGroup1 = await mockPrisma.group.findUnique({
      where: { id: groupId1 },
      include: { members: true },
    });
    expect(dbGroup1.status).toBe("ACTIVE");
    expect(dbGroup1.memberCount).toBe(3);
    expect(dbGroup1.startDate).not.toBeNull();
    expect(dbGroup1.currentCycle).toBe(1);

    // Cycles must be created (3 cycles for groupSize = 3)
    const cycles = await mockPrisma.cycle.findMany({
      where: { groupId: groupId1 },
    });
    expect(cycles.length).toBe(3);

    // Contributions must be created: 3 cycles * 3 members = 9 contributions!
    const contributions = await mockPrisma.contribution.findMany({
      where: { groupId: groupId1 },
    });
    expect(contributions.length).toBe(9);

    // 4. User 4 joins pool -> Group #1 is full, so User 4 starts Group #2!
    const res4 = await request(app)
      .post("/api/pools/CIT-1/join")
      .set("Authorization", `Bearer ${u4.token}`);
    expect(res4.status).toBe(200);
    expect(res4.body.groupId).not.toBe(groupId1);
    expect(res4.body.slot).toBe(1);
    expect(res4.body.groupStatus).toBe("FORMING");

    const dbGroup2 = await mockPrisma.group.findUnique({
      where: { id: res4.body.groupId },
    });
    expect(dbGroup2.groupNumber).toBe(2); // Group number increments!
  });
});
