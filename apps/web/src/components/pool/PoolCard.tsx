"use client";

import React from "react";
import { color, radius, spacing, Card, Badge, Button } from "@merit-circle/ui";
import { formatWeiToBnb, formatTier } from "../../lib/format";
import { useAuth } from "../../hooks/useAuth";
import { ZapIcon, CoinsIcon } from "../layout/Icons";

export interface PoolData {
  id: string;
  name: string;
  description?: string;
  mode: "BASIC" | "AUCTION";
  minimumTier: number;
  groupSize: number;
  cycleCount: number;
  contributionAmountWei: string;
  paymentWindowDays: number;
  auctionWindowDays: number;
  maxDiscountBps: number;
  isActive: boolean;
}

export interface PoolCardProps {
  pool: PoolData;
  userActiveGroupsCount?: number;
  onJoinClick?: (pool: PoolData) => void;
}

export const PoolCard: React.FC<PoolCardProps> = ({
  pool,
  userActiveGroupsCount = 0,
  onJoinClick,
}) => {
  const { user, isAuthenticated } = useAuth();

  // Evaluate Join gates
  let isJoinable = true;
  let disabledReason = "";

  if (!isAuthenticated || !user) {
    isJoinable = false;
    disabledReason = "Connect wallet first";
  } else if (!user.username) {
    isJoinable = false;
    disabledReason = "Set username in onboarding";
  } else if (!user.isEmailVerified) {
    isJoinable = false;
    disabledReason = "Verify email first";
  } else if (user.tier < pool.minimumTier) {
    isJoinable = false;
    disabledReason = `Requires ${formatTier(pool.minimumTier)}`;
  } else if (!pool.isActive) {
    isJoinable = false;
    disabledReason = "Pool is not currently active";
  }

  const isAuction = pool.mode === "AUCTION";

  return (
    <Card
      liquid
      variant={isAuction ? "cyan" : "liquid"}
      className="group hover:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(77,142,255,0.2)]"
      style={{
        borderRadius: radius.xl,
        padding: spacing["6"],
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: spacing["4"],
      }}
    >
      <div>
        {/* Card Header: Mode Badge and Tier Requirement */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing["3"] }}>
          <Badge variant={isAuction ? "info" : "neutral"} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            {isAuction ? <ZapIcon size={12} /> : <CoinsIcon size={12} />}
            <span>{isAuction ? "AUCTION ROSCA" : "BASIC ROSCA"}</span>
          </Badge>
          <span style={{ fontSize: "12px", color: color.text.muted, fontWeight: 600 }}>
            Min. Tier {pool.minimumTier}
          </span>
        </div>

        {/* Pool Name */}
        <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: "8px", color: color.text.primary }}>
          {pool.name}
        </h3>

        {/* Short Description */}
        <p style={{ fontSize: "13px", color: color.text.secondary, margin: 0, marginBottom: spacing["4"], minHeight: "36px", lineHeight: "1.5" }}>
          {pool.description || (isAuction ? "Dynamic bidding ROSCA pool with carried reward incentives." : "Standard rotating savings and credit pool.")}
        </p>

        {/* Pool Parameters Grid with Glassmorphic Inset */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            backgroundColor: "rgba(12, 15, 24, 0.6)",
            backdropFilter: "blur(12px)",
            padding: spacing["3"],
            borderRadius: radius.md,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
            fontSize: "12px",
          }}
        >
          <div>
            <div style={{ color: color.text.muted, marginBottom: "2px" }}>Contribution</div>
            <div style={{ fontWeight: 700, color: color.brand.accentElectric }}>
              {formatWeiToBnb(pool.contributionAmountWei)}
            </div>
          </div>

          <div>
            <div style={{ color: color.text.muted, marginBottom: "2px" }}>Cycle Count</div>
            <div style={{ fontWeight: 600, color: color.text.primary }}>
              {pool.cycleCount} Cycles ({pool.groupSize} Members)
            </div>
          </div>

          <div>
            <div style={{ color: color.text.muted, marginBottom: "2px" }}>Payment Window</div>
            <div style={{ fontWeight: 600, color: color.text.primary }}>
              {pool.paymentWindowDays} Days
            </div>
          </div>

          <div>
            <div style={{ color: color.text.muted, marginBottom: "2px" }}>Auction Window</div>
            <div style={{ fontWeight: 600, color: color.text.primary }}>
              {isAuction ? `${pool.auctionWindowDays} Days (Max ${pool.maxDiscountBps / 100}%)` : "None"}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div>
        <div style={{ display: "flex", gap: "10px" }}>
          <a
            href={`/pools/${pool.id}`}
            className="mc-glass-interactive"
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "42px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: color.text.primary,
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            }}
          >
            Details
          </a>

          <Button
            variant={!isJoinable ? "secondary" : isAuction ? "liquid-gold" : "liquid-metal"}
            size="md"
            disabled={!isJoinable}
            onClick={() => onJoinClick?.(pool)}
            style={{ flex: 1, height: "42px", borderRadius: "9999px" }}
          >
            {isJoinable ? "Join Pool" : "Locked"}
          </Button>
        </div>

        {!isJoinable && disabledReason && (
          <div
            style={{
              fontSize: "11px",
              color: color.status.warning,
              marginTop: "6px",
              textAlign: "center",
            }}
          >
            {disabledReason}
          </div>
        )}
      </div>
    </Card>
  );
};
