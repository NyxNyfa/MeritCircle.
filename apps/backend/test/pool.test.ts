import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { mockPrisma, resetMockDb } from "./mock-prisma";

vi.mock("../src/db/client", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { app } from "../src/app";

describe("Phase 10 - Pool Catalog Module", () => {
  beforeEach(() => {
    resetMockDb();
  });

  it("GET /api/pools returns list of active pools", async () => {
    const res = await request(app).get("/api/pools");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("pools");
    expect(Array.isArray(res.body.pools)).toBe(true);
    expect(res.body.pools.length).toBeGreaterThanOrEqual(2);

    const firstPool = res.body.pools[0];
    expect(firstPool).toHaveProperty("id");
    expect(firstPool).toHaveProperty("externalPoolId");
    expect(firstPool).toHaveProperty("name");
    expect(firstPool).toHaveProperty("mode");
    expect(firstPool).toHaveProperty("minimumTier");
    expect(firstPool).toHaveProperty("groupSize");
    expect(firstPool).toHaveProperty("contributionAmountWei");
    expect(firstPool.status).toBe("ACTIVE");
  });

  it("GET /api/pools/:poolId returns pool detail for valid ID or external ID", async () => {
    const res = await request(app).get("/api/pools/CIT-1");

    expect(res.status).toBe(200);
    expect(res.body.externalPoolId).toBe("CIT-1");
    expect(res.body.mode).toBe("BASIC");
    expect(res.body.minimumTier).toBe(2);
    expect(res.body.groupSize).toBe(3);
    expect(res.body.cycleCount).toBe(3);
    expect(res.body.contributionAmountWei).toBe("1000000000000000");
  });

  it("GET /api/pools/:poolId returns 404 for unknown pool", async () => {
    const res = await request(app).get("/api/pools/non_existent_pool");

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty("code", "NOT_FOUND");
  });
});
