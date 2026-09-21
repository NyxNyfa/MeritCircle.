"use client";

import React, { useState } from "react";
import { color, radius, spacing, Card, Badge, Button, Input } from "@merit-circle/ui";
import { formatWeiToBnb, formatBpsToPercent } from "../../lib/format";
import { submitBid } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";

export interface AuctionData {
  id: string;
  cycleId: string;
  groupId: string;
  cycleNumber: number;
  totalCycles: number;
  status: "SCHEDULED" | "OPEN" | "CLOSED" | "SETTLED";
  carriedRewardWei: string;
  baseRewardWei: string;
  totalRewardPoolWei: string;
  maxDiscountBps: number;
  minimumPayoutWei: string;
  isFinalCycle: boolean;
  bestBidBps?: number;
  myBidBps?: number;
  recipientAddress?: string;
  isEligibleToBid?: boolean;
}

export const AuctionCard: React.FC<{
  auction: AuctionData;
  onBidSuccess?: () => void;
}> = ({ auction, onBidSuccess }) => {
  const [discountPercent, setDiscountPercent] = useState<string>("5");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const maxDiscountPercent = auction.maxDiscountBps / 100;

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) {
      setError("Please acknowledge your continued payment obligation if you win the auction.");
      return;
    }

    const val = parseFloat(discountPercent);
    if (isNaN(val) || val <= 0 || val > maxDiscountPercent) {
      setError(`Discount must be between 0.1% and ${maxDiscountPercent}%`);
      return;
    }

    const discountBps = Math.round(val * 100);

    setIsSubmitting(true);
    setError(null);
    try {
      await submitBid(auction.id, discountBps);
      onBidSuccess?.();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================================================
   * CRITICAL RULE: FINAL CYCLE MUST NOT SHOW BID FORM & PAYS FULL REWARD POOL
   * ========================================================================= */
  if (auction.isFinalCycle) {
    return (
      <Card
        liquid
        variant="cyan"
        style={{
          borderRadius: radius.xl,
          padding: spacing["6"],
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing["4"] }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Badge variant="success">FINAL CYCLE</Badge>
            <span style={{ fontSize: "16px", fontWeight: 700, color: color.text.primary }}>
              Cycle #{auction.cycleNumber} of {auction.totalCycles} — Full Reward Distribution
            </span>
          </div>
          <span style={{ fontSize: "12px", color: color.status.success, fontWeight: 600 }}>
            No Auction Discount
          </span>
        </div>

        <div
          style={{
            backgroundColor: "rgba(12, 15, 24, 0.6)",
            backdropFilter: "blur(12px)",
            padding: spacing["6"],
            borderRadius: radius.lg,
            border: "1px solid rgba(0, 229, 255, 0.2)",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.3), 0 0 20px rgba(0, 229, 255, 0.1)",
            marginBottom: spacing["4"],
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "13px", color: color.text.muted, marginBottom: "4px" }}>
            Final Reward Pool Payout (100% Full Payout)
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: color.brand.accentElectric,
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: "8px",
            }}
          >
            {formatWeiToBnb(auction.totalRewardPoolWei)}
          </div>
          <div style={{ fontSize: "13px", color: color.text.secondary }}>
            All accumulated funds + carried rewards are released to the final eligible recipient in
            full.
          </div>
        </div>

        <div
          style={{
            padding: spacing["4"],
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: radius.md,
            fontSize: "13px",
            color: color.text.secondary,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, color: color.status.info, marginBottom: "4px" }}>
            ℹ️ Final Cycle ROSCA Guarantee
          </div>
          Pada siklus final, tidak ada proses lelang diskon. Penerima terakhir berhak atas 100% total
          reward pool secara utuh tanpa potongan, dan seluruh sisa carried reward disalurkan tuntas.
        </div>
      </Card>
    );
  }

  /* =========================================================================
   * NON-FINAL CYCLES: STANDARD AUCTION BIDDING ROOM
   * ========================================================================= */
  return (
    <Card
      liquid
      variant="liquid"
      style={{
        borderRadius: radius.xl,
        padding: spacing["6"],
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing["4"] }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Badge variant={auction.status === "OPEN" ? "info" : "neutral"}>
            AUCTION {auction.status}
          </Badge>
          <span style={{ fontSize: "16px", fontWeight: 700, color: color.text.primary }}>
            Cycle #{auction.cycleNumber} Bidding Room
          </span>
        </div>
        <span style={{ fontSize: "12px", color: color.text.muted }}>
          Max Discount: {maxDiscountPercent}%
        </span>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: spacing["3"],
          backgroundColor: color.background.surface,
          padding: spacing["4"],
          borderRadius: radius.md,
          border: `1px solid ${color.border.subtle}`,
          marginBottom: spacing["4"],
          fontSize: "13px",
        }}
      >
        <div>
          <div style={{ color: color.text.muted, fontSize: "12px", marginBottom: "2px" }}>
            Total Reward Pool
          </div>
          <div style={{ fontWeight: 700, color: color.brand.accentElectric, fontSize: "16px" }}>
            {formatWeiToBnb(auction.totalRewardPoolWei)}
          </div>
          <div style={{ fontSize: "11px", color: color.text.muted }}>
            Carried: {formatWeiToBnb(auction.carriedRewardWei)}
          </div>
        </div>

        <div>
          <div style={{ color: color.text.muted, fontSize: "12px", marginBottom: "2px" }}>
            Minimum Payout
          </div>
          <div style={{ fontWeight: 700, color: color.text.primary, fontSize: "16px" }}>
            {formatWeiToBnb(auction.minimumPayoutWei)}
          </div>
          <div style={{ fontSize: "11px", color: color.text.muted }}>
            Floor at {maxDiscountPercent}% discount
          </div>
        </div>

        <div>
          <div style={{ color: color.text.muted, fontSize: "12px", marginBottom: "2px" }}>
            Best Current Bid
          </div>
          <div style={{ fontWeight: 700, color: color.status.success, fontSize: "16px" }}>
            {auction.bestBidBps ? `${auction.bestBidBps / 100}% Discount` : "No bids yet"}
          </div>
          <div style={{ fontSize: "11px", color: color.text.muted }}>
            Your bid: {auction.myBidBps ? `${auction.myBidBps / 100}%` : "None"}
          </div>
        </div>
      </div>

      {/* Bid Submission Form */}
      {auction.status === "OPEN" && (
        <form onSubmit={handleSubmitBid} style={{ display: "flex", flexDirection: "column", gap: spacing["3"] }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
              Your Offered Discount Rate (%):
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max={maxDiscountPercent}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="e.g. 5"
              />
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  backgroundColor: color.background.surface,
                  borderRadius: radius.md,
                  border: `1px solid ${color.border.subtle}`,
                  fontSize: "14px",
                  color: color.text.secondary,
                }}
              >
                %
              </span>
            </div>
            <span style={{ fontSize: "11px", color: color.text.muted, marginTop: "4px", display: "block" }}>
              Highest discount wins payout priority. Surplus carries forward to reward subsequent
              cycles.
            </span>
          </div>

          {/* Mandatory Disclosure Checkbox */}
          <div
            style={{
              padding: spacing["3"],
              borderRadius: radius.md,
              backgroundColor: color.background.cardElevated,
              border: `1px solid ${color.border.subtle}`,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                fontSize: "12px",
                color: color.text.secondary,
                lineHeight: 1.4,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                style={{ marginTop: "2px" }}
              />
              <span>
                <strong>Pemberitahuan Kewajiban:</strong> Jika kamu menang auction, kamu tetap wajib
                membayar kontribusi pada siklus berikutnya sampai seluruh siklus selesai.
              </span>
            </label>
          </div>

          {error && (
            <div
              style={{
                padding: spacing["2"],
                borderRadius: radius.sm,
                backgroundColor: color.status.errorBackground,
                border: `1px solid ${color.status.error}`,
                color: color.status.error,
                fontSize: "12px",
              }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            disabled={!acknowledged}
          >
            Submit Auction Bid ({discountPercent}% Discount)
          </Button>
        </form>
      )}
    </Card>
  );
};
