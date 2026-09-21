"use client";

import React from "react";
import { color, radius, spacing, Card } from "@merit-circle/ui";
import { formatPoint, formatTier } from "../../lib/format";

export interface ReputationOverviewProps {
  points: number;
  tier: number;
  maxActiveGroups: number;
}

// Tier point thresholds from domain specification
const TIER_THRESHOLDS = [
  { tier: 1, name: "Newcomer", min: 0, max: 99, maxGroups: 1 },
  { tier: 2, name: "Citizen", min: 100, max: 249, maxGroups: 2 },
  { tier: 3, name: "Builder", min: 250, max: 499, maxGroups: 3 },
  { tier: 4, name: "Trusted", min: 500, max: 749, maxGroups: 4 },
  { tier: 5, name: "Prime", min: 750, max: 1000, maxGroups: 5 },
];

export const ReputationOverview: React.FC<ReputationOverviewProps> = ({
  points,
  tier,
  maxActiveGroups,
}) => {
  const currentThreshold = TIER_THRESHOLDS.find((t) => t.tier === tier) || TIER_THRESHOLDS[0];
  const nextThreshold = TIER_THRESHOLDS.find((t) => t.tier === tier + 1);

  let progressPercent = 100;
  if (nextThreshold) {
    const range = nextThreshold.min - currentThreshold.min;
    const progress = points - currentThreshold.min;
    progressPercent = Math.min(Math.max(Math.round((progress / range) * 100), 0), 100);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing["6"], marginBottom: spacing["8"] }}>
      {/* Reputation Score Card */}
      <Card
        liquid
        variant="cyan"
        style={{
          borderRadius: radius.xl,
          padding: spacing["6"],
        }}
      >
        <div style={{ fontSize: "13px", color: color.text.muted, marginBottom: "4px" }}>
          Reputation Score
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: spacing["3"] }}>
          <span
            style={{
              fontSize: "44px",
              fontWeight: 800,
              color: color.brand.accentElectric,
              fontFamily: "'JetBrains Mono', monospace",
              textShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
            }}
          >
            {points}
          </span>
          <span style={{ fontSize: "14px", color: color.text.muted }}>/ 1000 pts</span>
        </div>

        {/* Progress bar to next tier */}
        <div style={{ marginBottom: spacing["3"] }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
            <span style={{ color: color.text.secondary }}>{currentThreshold.name}</span>
            <span style={{ color: color.text.muted }}>
              {nextThreshold ? `Next: ${nextThreshold.name} (${nextThreshold.min} pts)` : "Max Tier Reached"}
            </span>
          </div>
          <div
            style={{
              height: "8px",
              backgroundColor: "rgba(12, 15, 24, 0.7)",
              borderRadius: radius.full,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #4d8eff 0%, #00e5ff 100%)",
                boxShadow: "0 0 12px rgba(0, 229, 255, 0.5)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: "12px", color: color.text.muted }}>
          Skor reputasi dihitung secara dinamis dari ketepatan waktu setor, verifikasi identitas, dan penyelesaian siklus.
        </div>
      </Card>

      {/* Tier Benefits Card */}
      <Card
        liquid
        variant="liquid"
        style={{
          borderRadius: radius.xl,
          padding: spacing["6"],
        }}
      >
        <div style={{ fontSize: "13px", color: color.text.muted, marginBottom: "4px" }}>
          Active Tier Level
        </div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: color.text.primary, marginBottom: spacing["4"] }}>
          {formatTier(tier)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "13px",
            color: color.text.secondary,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${color.border.subtle}` }}>
            <span>Max Concurrent Active Groups:</span>
            <span style={{ fontWeight: 700, color: color.status.success }}>{maxActiveGroups} Groups</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${color.border.subtle}` }}>
            <span>Eligible Pool Access:</span>
            <span style={{ fontWeight: 600, color: color.text.primary }}>
              Tier {tier} and below
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Auction Discount Privileges:</span>
            <span style={{ fontWeight: 600, color: color.brand.accentCyan }}>
              Full access to non-final bidding
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
