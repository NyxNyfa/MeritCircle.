import { describe, expect, it } from "vitest";
import { calculateLateDays, calculateLatePenalty } from "../src/penalty";

describe("penalty module", () => {
  describe("calculateLateDays", () => {
    it("returns 0 when on or before day 10 (standard window)", () => {
      expect(calculateLateDays(1, 10)).toBe(0);
      expect(calculateLateDays(5, 10)).toBe(0);
      expect(calculateLateDays(10, 10)).toBe(0);
    });

    it("returns correct days late after day 10", () => {
      expect(calculateLateDays(11, 10)).toBe(1);
      expect(calculateLateDays(12, 10)).toBe(2);
      expect(calculateLateDays(15, 10)).toBe(5);
      expect(calculateLateDays(20, 10)).toBe(10);
      expect(calculateLateDays(30, 10)).toBe(20);
    });

    it("uses default window of 10 days if not provided", () => {
      expect(calculateLateDays(10)).toBe(0);
      expect(calculateLateDays(11)).toBe(1);
      expect(calculateLateDays(15)).toBe(5);
    });
  });

  describe("calculateLatePenalty", () => {
    it("applies zero penalty for 0 days late", () => {
      expect(calculateLatePenalty(0)).toBe(0);
    });

    it("applies negative late days gracefully as 0 penalty", () => {
      expect(calculateLatePenalty(-5)).toBe(0);
    });

    it("calculates exact 10 points per day late", () => {
      expect(calculateLatePenalty(1)).toBe(10);
      expect(calculateLatePenalty(2)).toBe(20);
      expect(calculateLatePenalty(5)).toBe(50);
      expect(calculateLatePenalty(9)).toBe(90);
      expect(calculateLatePenalty(10)).toBe(100);
    });

    it("caps penalty strictly at 100 points maximum per cycle", () => {
      expect(calculateLatePenalty(10)).toBe(100);
      expect(calculateLatePenalty(11)).toBe(100);
      expect(calculateLatePenalty(20)).toBe(100);
      expect(calculateLatePenalty(30)).toBe(100);
      expect(calculateLatePenalty(100)).toBe(100);
    });
  });

  describe("end-to-end cycle penalty progression", () => {
    const windowDays = 10;

    it("matches all canonical cycle day test points", () => {
      // cycleDay 10 → daysLate 0 → penalty 0
      expect(calculateLatePenalty(calculateLateDays(10, windowDays))).toBe(0);

      // cycleDay 11 → daysLate 1 → penalty 10
      expect(calculateLatePenalty(calculateLateDays(11, windowDays))).toBe(10);

      // cycleDay 12 → daysLate 2 → penalty 20
      expect(calculateLatePenalty(calculateLateDays(12, windowDays))).toBe(20);

      // cycleDay 15 → daysLate 5 → penalty 50
      expect(calculateLatePenalty(calculateLateDays(15, windowDays))).toBe(50);

      // cycleDay 20 → daysLate 10 → penalty 100
      expect(calculateLatePenalty(calculateLateDays(20, windowDays))).toBe(100);

      // cycleDay 30 → daysLate 20 → penalty 100
      expect(calculateLatePenalty(calculateLateDays(30, windowDays))).toBe(100);
    });
  });
});
