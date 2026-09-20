import { describe, expect, it } from "vitest";
import {
  calculateMinimumPayout,
  selectWinningBid,
  validateBid,
} from "../src/auction";
import { Bid } from "../src/types";

describe("auction module", () => {
  describe("calculateMinimumPayout", () => {
    it("calculates minimum payout using basis points discount correctly", () => {
      // 10% discount (1000 bps) on 10000 wei -> 9000 wei
      expect(calculateMinimumPayout(10000n, 1000)).toBe(9000n);

      // 5% discount (500 bps) on 1 ether -> 0.95 ether
      expect(calculateMinimumPayout(1000000000000000000n, 500)).toBe(
        950000000000000000n
      );

      // 0% discount (0 bps) -> full amount
      expect(calculateMinimumPayout(5000n, 0)).toBe(5000n);

      // 100% discount (10000 bps) -> 0 wei
      expect(calculateMinimumPayout(5000n, 10000)).toBe(0n);
    });

    it("throws on invalid maxDiscountBps or negative rewardPool", () => {
      expect(() => calculateMinimumPayout(-100n, 500)).toThrow();
      expect(() => calculateMinimumPayout(1000n, -1)).toThrow();
      expect(() => calculateMinimumPayout(1000n, 10001)).toThrow();
    });
  });

  describe("validateBid", () => {
    const rewardPoolWei = 10000n;
    const maxDiscountBps = 1000; // min payout is 9000n

    it("accepts bids within valid boundary [minPayout, rewardPool]", () => {
      expect(
        validateBid({ payoutAmountWei: 9000n, rewardPoolWei, maxDiscountBps })
          .valid
      ).toBe(true);
      expect(
        validateBid({ payoutAmountWei: 9500n, rewardPoolWei, maxDiscountBps })
          .valid
      ).toBe(true);
      expect(
        validateBid({ payoutAmountWei: 10000n, rewardPoolWei, maxDiscountBps })
          .valid
      ).toBe(true);
    });

    it("rejects bids below minimum payout", () => {
      const result = validateBid({
        payoutAmountWei: 8999n,
        rewardPoolWei,
        maxDiscountBps,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("rejects bids above reward pool", () => {
      const result = validateBid({
        payoutAmountWei: 10001n,
        rewardPoolWei,
        maxDiscountBps,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("rejects zero or negative bids", () => {
      expect(
        validateBid({ payoutAmountWei: 0n, rewardPoolWei, maxDiscountBps }).valid
      ).toBe(false);
      expect(
        validateBid({ payoutAmountWei: -500n, rewardPoolWei, maxDiscountBps })
          .valid
      ).toBe(false);
    });
  });

  describe("selectWinningBid", () => {
    it("returns null when no bids are submitted", () => {
      expect(selectWinningBid([])).toBeNull();
    });

    it("returns the only bid if single bid submitted", () => {
      const bid: Bid = {
        bidId: "b1",
        userId: "u1",
        payoutAmountWei: 9500n,
        submittedAt: 1000,
      };
      expect(selectWinningBid([bid])).toEqual(bid);
    });

    it("selects lowest valid payout bid as winner", () => {
      const bids: Bid[] = [
        { bidId: "b1", userId: "u1", payoutAmountWei: 9800n, submittedAt: 100 },
        { bidId: "b2", userId: "u2", payoutAmountWei: 9200n, submittedAt: 150 },
        { bidId: "b3", userId: "u3", payoutAmountWei: 9500n, submittedAt: 200 },
      ];
      const winner = selectWinningBid(bids);
      expect(winner?.bidId).toBe("b2");
      expect(winner?.payoutAmountWei).toBe(9200n);
    });

    it("breaks ties using earliest submittedAt timestamp", () => {
      const bids: Bid[] = [
        { bidId: "b1", userId: "u1", payoutAmountWei: 9500n, submittedAt: 300 },
        { bidId: "b2", userId: "u2", payoutAmountWei: 9000n, submittedAt: 200 }, // tie with b3, earlier
        { bidId: "b3", userId: "u3", payoutAmountWei: 9000n, submittedAt: 250 }, // tie with b2, later
      ];
      const winner = selectWinningBid(bids);
      expect(winner?.bidId).toBe("b2");
      expect(winner?.submittedAt).toBe(200);
    });
  });
});
