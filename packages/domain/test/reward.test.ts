import { describe, expect, it } from "vitest";
import {
  calculateBaseReward,
  calculateFinalSettlement,
  calculateNonFinalAuctionSettlement,
  calculateRewardPool,
} from "../src/reward";

describe("reward module", () => {
  describe("calculateBaseReward", () => {
    it("multiplies groupSize by contributionAmountWei", () => {
      expect(calculateBaseReward(3, 1000n)).toBe(3000n);
      expect(calculateBaseReward(5, 50000000000000000n)).toBe(
        250000000000000000n
      );
      expect(calculateBaseReward(10, 100000000000000000n)).toBe(
        1000000000000000000n
      );
    });

    it("throws on negative input values", () => {
      expect(() => calculateBaseReward(-1, 1000n)).toThrow();
      expect(() => calculateBaseReward(3, -500n)).toThrow();
    });
  });

  describe("calculateRewardPool", () => {
    it("sums baseReward and carriedReward", () => {
      expect(calculateRewardPool(3000n, 0n)).toBe(3000n);
      expect(calculateRewardPool(3000n, 300n)).toBe(3300n);
    });

    it("throws on negative values", () => {
      expect(() => calculateRewardPool(-100n, 50n)).toThrow();
      expect(() => calculateRewardPool(100n, -50n)).toThrow();
    });
  });

  describe("calculateNonFinalAuctionSettlement", () => {
    it("carries over the surplus between reward pool and winner payout", () => {
      const settlement = calculateNonFinalAuctionSettlement(3000n, 2700n);
      expect(settlement.payoutWei).toBe(2700n);
      expect(settlement.carriedRewardWei).toBe(300n);
    });

    it("handles zero discount (full payout)", () => {
      const settlement = calculateNonFinalAuctionSettlement(3000n, 3000n);
      expect(settlement.payoutWei).toBe(3000n);
      expect(settlement.carriedRewardWei).toBe(0n);
    });

    it("throws if winner payout exceeds reward pool", () => {
      expect(() => calculateNonFinalAuctionSettlement(3000n, 3001n)).toThrow();
    });

    it("throws if winner payout is negative", () => {
      expect(() => calculateNonFinalAuctionSettlement(3000n, -1n)).toThrow();
    });
  });

  describe("calculateFinalSettlement", () => {
    it("pays out full reward pool and enforces strictly 0 carryover (NO FINAL SURPLUS)", () => {
      const settlement = calculateFinalSettlement(3000n, 300n);
      expect(settlement.finalPayoutWei).toBe(3300n);
      expect(settlement.carriedRewardWei).toBe(0n);
    });

    it("handles final settlement with zero prior carryover", () => {
      const settlement = calculateFinalSettlement(5000n, 0n);
      expect(settlement.finalPayoutWei).toBe(5000n);
      expect(settlement.carriedRewardWei).toBe(0n);
    });

    it("throws on negative input rewards", () => {
      expect(() => calculateFinalSettlement(-100n, 0n)).toThrow();
      expect(() => calculateFinalSettlement(100n, -10n)).toThrow();
    });
  });

  describe("end-to-end multi-cycle test scenario from specification", () => {
    it("simulates a 3-cycle group progression accurately", () => {
      const groupSize = 3;
      const contributionWei = 1000n;

      // Cycle 1:
      const cycle1Base = calculateBaseReward(groupSize, contributionWei);
      expect(cycle1Base).toBe(3000n);
      let carried = 0n;
      const cycle1Pool = calculateRewardPool(cycle1Base, carried);
      expect(cycle1Pool).toBe(3000n);
      const cycle1Settlement = calculateNonFinalAuctionSettlement(
        cycle1Pool,
        2700n
      );
      expect(cycle1Settlement.payoutWei).toBe(2700n);
      expect(cycle1Settlement.carriedRewardWei).toBe(300n);
      carried = cycle1Settlement.carriedRewardWei;

      // Cycle 2:
      const cycle2Base = calculateBaseReward(groupSize, contributionWei);
      expect(cycle2Base).toBe(3000n);
      const cycle2Pool = calculateRewardPool(cycle2Base, carried);
      expect(cycle2Pool).toBe(3300n);
      const cycle2Settlement = calculateNonFinalAuctionSettlement(
        cycle2Pool,
        3000n
      );
      expect(cycle2Settlement.payoutWei).toBe(3000n);
      expect(cycle2Settlement.carriedRewardWei).toBe(300n);
      carried = cycle2Settlement.carriedRewardWei;

      // Final cycle (Cycle 3):
      const cycle3Base = calculateBaseReward(groupSize, contributionWei);
      expect(cycle3Base).toBe(3000n);
      const finalSettlement = calculateFinalSettlement(cycle3Base, carried);
      expect(finalSettlement.finalPayoutWei).toBe(3300n);
      expect(finalSettlement.carriedRewardWei).toBe(0n);
    });
  });
});
