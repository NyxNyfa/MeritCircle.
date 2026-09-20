import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb, dbState } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";
import { signJwt } from "../src/utils/jwt";

describe("Phase 13 - Admin Module Tests", () => {
  let adminId: string;
  let adminToken: string;
  let regularUserId: string;
  let regularUserToken: string;

  beforeEach(async () => {
    resetMockDb();

    // Create Admin user
    const admin = await mockPrisma.user.create({
      data: {
        walletAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        role: "ADMIN",
        profile: {
          create: {
            username: "admin",
            email: "admin@meritcircle.local",
            emailVerifiedAt: new Date(),
          },
        },
        reputation: {
          create: {
            points: 1000,
            tier: 5,
          },
        },
      },
    });
    adminId = admin.id;
    adminToken = signJwt({
      sub: admin.id,
      walletAddress: admin.walletAddress,
      role: admin.role,
    });

    // Create Regular user
    const regular = await mockPrisma.user.create({
      data: {
        walletAddress: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
        role: "USER",
        profile: {
          create: {
            username: "alice",
            email: "alice@example.com",
            emailVerifiedAt: new Date(),
          },
        },
        reputation: {
          create: {
            points: 300,
            tier: 2,
          },
        },
      },
    });
    regularUserId = regular.id;
    regularUserToken = signJwt({
      sub: regular.id,
      walletAddress: regular.walletAddress,
      role: regular.role,
    });
  });

  describe("Health Check", () => {
    it("GET /api/health returns ok and service name", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.service).toBe("merit-circle-backend");
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe("Admin Authorization Guard", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/admin/overview");
      expect(res.status).toBe(401);
    });

    it("rejects non-admin users with 403", async () => {
      const res = await request(app)
        .get("/api/admin/overview")
        .set("Authorization", `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/admin role required/i);
    });

    it("allows ADMIN users to access overview", async () => {
      const res = await request(app)
        .get("/api/admin/overview")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.totalUsers).toBeGreaterThanOrEqual(2);
      expect(res.body.totalPools).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Admin User Management & Reputation Adjustment", () => {
    it("GET /api/admin/users returns list of users with reputation and profile", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.users[0]).toHaveProperty("walletAddress");
      expect(res.body.users[0]).toHaveProperty("reputationPoints");
      expect(res.body.users[0]).toHaveProperty("tier");
    });

    it("GET /api/admin/users/:userId returns details of specific user", async () => {
      const res = await request(app)
        .get(`/api/admin/users/${regularUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(regularUserId);
      expect(res.body.user.username).toBe("alice");
      expect(res.body.user.reputationPoints).toBe(300);
    });

    it("POST /api/admin/users/:userId/reputation/adjust modifies points and logs audit", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${regularUserId}/reputation/adjust`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          points: 350,
          reason: "Demo seed Tier 4",
        });

      expect(res.status).toBe(200);
      expect(res.body.pointsAdded).toBe(350);
      expect(res.body.newPoints).toBe(650);
      expect(res.body.tier).toBe(3);

      // Verify audit log
      const auditRes = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(auditRes.status).toBe(200);
      const log = auditRes.body.auditLogs.find(
        (l: any) => l.action === "ADJUST_REPUTATION" && l.entityId === regularUserId
      );
      expect(log).toBeDefined();
      expect(log.metadata.reason).toBe("Demo seed Tier 4");
    });

    it("clamps reputation points between 0 and 1000", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${regularUserId}/reputation/adjust`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          points: 2000,
          reason: "Max out points",
        });

      expect(res.status).toBe(200);
      expect(res.body.newPoints).toBe(1000);
      expect(res.body.tier).toBe(5);
    });
  });

  describe("Admin Pool Management", () => {
    it("GET /api/admin/pools returns pools", async () => {
      const res = await request(app)
        .get("/api/admin/pools")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.pools).toBeInstanceOf(Array);
      expect(res.body.pools.length).toBeGreaterThan(0);
    });

    it("POST /api/admin/pools creates new pool with audit log", async () => {
      const res = await request(app)
        .post("/api/admin/pools")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          externalPoolId: "TEST-POOL-1",
          name: "Test Auction Pool",
          description: "Pool for testing admin creation",
          mode: "AUCTION",
          minimumTier: 4,
          groupSize: 5,
          cycleDurationDays: 30,
          paymentWindowDays: 10,
          auctionOpenDay: 11,
          auctionCloseDay: 20,
          settlementDay: 30,
          contributionAmountWei: "500000000000000000",
          maxDiscountBps: 2000,
          status: "ACTIVE",
        });

      expect(res.status).toBe(201);
      expect(res.body.pool.externalPoolId).toBe("TEST-POOL-1");
      expect(res.body.pool.cycleCount).toBe(5);

      // Verify audit log
      const auditRes = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);
      const log = auditRes.body.auditLogs.find(
        (l: any) => l.action === "CREATE_POOL" && l.entityId === res.body.pool.id
      );
      expect(log).toBeDefined();
    });

    it("PATCH /api/admin/pools/:poolId updates pool status and description", async () => {
      const pool = await mockPrisma.pool.findFirst({ where: { externalPoolId: "CIT-1" } });
      expect(pool).toBeDefined();

      const res = await request(app)
        .patch(`/api/admin/pools/${pool.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "PAUSED",
          description: "Temporarily paused for maintenance",
        });

      expect(res.status).toBe(200);
      expect(res.body.pool.status).toBe("PAUSED");
      expect(res.body.pool.description).toBe("Temporarily paused for maintenance");
    });
  });

  describe("Admin Groups and Fill Demo", () => {
    it("POST /api/admin/groups/:groupId/fill-demo fills forming group and activates it", async () => {
      const pool = await mockPrisma.pool.findFirst({ where: { externalPoolId: "CIT-1" } });
      const group = await mockPrisma.group.create({
        data: {
          poolId: pool.id,
          groupNumber: 99,
          status: "FORMING",
          memberCount: 0,
        },
      });

      const res = await request(app)
        .post(`/api/admin/groups/${group.id}/fill-demo`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ prefix: "bot" });

      expect(res.status).toBe(200);
      expect(res.body.activated).toBe(true);
      expect(res.body.addedMembersCount).toBe(pool.groupSize);

      // Verify audit log
      const auditRes = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);
      const log = auditRes.body.auditLogs.find(
        (l: any) => l.action === "FILL_DEMO_GROUP" && l.entityId === group.id
      );
      expect(log).toBeDefined();
      expect(log.metadata.isDemoTool).toBe(true);
    });

    it("POST /api/admin/groups/:groupId/fill-demo fails if group is already ACTIVE", async () => {
      const pool = await mockPrisma.pool.findFirst({ where: { externalPoolId: "CIT-1" } });
      const group = await mockPrisma.group.create({
        data: {
          poolId: pool.id,
          groupNumber: 100,
          status: "ACTIVE",
          memberCount: pool.groupSize,
        },
      });

      const res = await request(app)
        .post(`/api/admin/groups/${group.id}/fill-demo`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      const errMsg = typeof res.body.error === "string" ? res.body.error : res.body.error?.message;
      expect(errMsg).toContain("Only FORMING groups can be filled with demo users");
    });
  });

  describe("Admin Audit Logs", () => {
    it("GET /api/admin/audit-logs supports pagination and returns total", async () => {
      // Create some audit entries
      await mockPrisma.auditLog.create({
        data: {
          actorUserId: adminId,
          actorType: "ADMIN",
          action: "SETTLE_CYCLE",
          entityType: "CYCLE",
          entityId: "cycle_123",
          metadata: { note: "manual trigger" },
        },
      });

      const res = await request(app)
        .get("/api/admin/audit-logs?limit=5&offset=0")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("auditLogs");
      expect(res.body).toHaveProperty("total");
      expect(res.body.limit).toBe(5);
      expect(res.body.offset).toBe(0);
    });
  });
});
