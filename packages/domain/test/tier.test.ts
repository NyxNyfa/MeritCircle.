import { describe, expect, it } from "vitest";
import { getTierFromPoints, TIERS } from "../src/tier";

describe("getTierFromPoints", () => {
  it("resolves Tier 1 boundaries (0 - 100)", () => {
    const at0 = getTierFromPoints(0);
    expect(at0.tier).toBe(1);
    expect(at0.name).toBe("Newcomer");
    expect(at0.maxActiveGroups).toBe(1);

    const at50 = getTierFromPoints(50);
    expect(at50.tier).toBe(1);

    const at100 = getTierFromPoints(100);
    expect(at100.tier).toBe(1);
    expect(at100.maxActiveGroups).toBe(1);
  });

  it("resolves Tier 2 boundaries (101 - 400)", () => {
    const at101 = getTierFromPoints(101);
    expect(at101.tier).toBe(2);
    expect(at101.name).toBe("Citizen");
    expect(at101.maxActiveGroups).toBe(2);

    const at250 = getTierFromPoints(250);
    expect(at250.tier).toBe(2);

    const at400 = getTierFromPoints(400);
    expect(at400.tier).toBe(2);
    expect(at400.maxActiveGroups).toBe(2);
  });

  it("resolves Tier 3 boundaries (401 - 700)", () => {
    const at401 = getTierFromPoints(401);
    expect(at401.tier).toBe(3);
    expect(at401.name).toBe("Builder");
    expect(at401.maxActiveGroups).toBe(3);

    const at550 = getTierFromPoints(550);
    expect(at550.tier).toBe(3);

    const at700 = getTierFromPoints(700);
    expect(at700.tier).toBe(3);
    expect(at700.maxActiveGroups).toBe(3);
  });

  it("resolves Tier 4 boundaries (701 - 900)", () => {
    const at701 = getTierFromPoints(701);
    expect(at701.tier).toBe(4);
    expect(at701.name).toBe("Trusted");
    expect(at701.maxActiveGroups).toBe(4);

    const at800 = getTierFromPoints(800);
    expect(at800.tier).toBe(4);

    const at900 = getTierFromPoints(900);
    expect(at900.tier).toBe(4);
    expect(at900.maxActiveGroups).toBe(4);
  });

  it("resolves Tier 5 boundaries (901 - 1000)", () => {
    const at901 = getTierFromPoints(901);
    expect(at901.tier).toBe(5);
    expect(at901.name).toBe("Prime");
    expect(at901.maxActiveGroups).toBe(5);

    const at950 = getTierFromPoints(950);
    expect(at950.tier).toBe(5);

    const at1000 = getTierFromPoints(1000);
    expect(at1000.tier).toBe(5);
    expect(at1000.maxActiveGroups).toBe(5);
  });

  it("clamps out-of-range points before resolving tier", () => {
    expect(getTierFromPoints(-50).tier).toBe(1);
    expect(getTierFromPoints(1500).tier).toBe(5);
  });

  it("verifies TIERS dictionary consistency", () => {
    expect(TIERS[1].maxActiveGroups).toBe(1);
    expect(TIERS[2].maxActiveGroups).toBe(2);
    expect(TIERS[3].maxActiveGroups).toBe(3);
    expect(TIERS[4].maxActiveGroups).toBe(4);
    expect(TIERS[5].maxActiveGroups).toBe(5);
  });
});
