import { describe, expect, it } from "vitest";
import { clampReputationPoints } from "../src/reputation";

describe("clampReputationPoints", () => {
  it("clamps negative points to 0", () => {
    expect(clampReputationPoints(-10)).toBe(0);
    expect(clampReputationPoints(-1)).toBe(0);
  });

  it("handles boundary points 0 and 1000 exactly", () => {
    expect(clampReputationPoints(0)).toBe(0);
    expect(clampReputationPoints(1000)).toBe(1000);
  });

  it("preserves valid points in [0, 1000]", () => {
    expect(clampReputationPoints(100)).toBe(100);
    expect(clampReputationPoints(500)).toBe(500);
    expect(clampReputationPoints(900)).toBe(900);
  });

  it("clamps points exceeding 1000 to 1000", () => {
    expect(clampReputationPoints(1001)).toBe(1000);
    expect(clampReputationPoints(1200)).toBe(1000);
    expect(clampReputationPoints(99999)).toBe(1000);
  });

  it("handles NaN safely by returning 0", () => {
    expect(clampReputationPoints(NaN)).toBe(0);
  });
});
