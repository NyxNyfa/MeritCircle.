"use client";

import React from "react";
import { color, radius, spacing, Badge } from "@merit-circle/ui";
import { formatWeiToBnb, formatDate } from "../../lib/format";

export interface CycleInfo {
  id: string;
  cycleNumber: number;
  startDate: string;
  endDate: string;
  status: "UPCOMING" | "COLLECTING" | "AUCTION" | "SETTLING" | "COMPLETED";
  isFinalCycle: boolean;
  rewardPoolWei: string;
  recipientAddress?: string;
  carriedRewardWei?: string;
}

export const CycleTimeline: React.FC<{
  cycles: CycleInfo[];
  currentCycleNumber: number;
}> = ({ cycles, currentCycleNumber }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing["3"] }}>
      {cycles.map((cycle) => {
        const isCurrent = cycle.cycleNumber === currentCycleNumber;
        const isCompleted = cycle.cycleNumber < currentCycleNumber;

        return (
          <div
            key={cycle.id || cycle.cycleNumber}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: spacing["4"],
              borderRadius: radius.md,
              backgroundColor: isCurrent ? color.background.cardElevated : color.background.card,
              border: `1px solid ${isCurrent ? color.border.active : color.border.subtle}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: isCompleted
                    ? color.status.success
                    : isCurrent
                    ? color.brand.primary
                    : color.background.surface,
                  color: isCompleted ? "#0B0E17" : "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                {isCompleted ? "✓" : cycle.cycleNumber}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px", color: color.text.primary }}>
                    Cycle {cycle.cycleNumber}
                  </span>
                  {cycle.isFinalCycle && <Badge variant="warning">FINAL CYCLE</Badge>}
                  {isCurrent && <Badge variant="info">CURRENT</Badge>}
                </div>
                <div style={{ fontSize: "12px", color: color.text.muted }}>
                  {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", fontSize: "13px" }}>
              <div style={{ fontWeight: 600, color: color.brand.accentElectric }}>
                Pool: {formatWeiToBnb(cycle.rewardPoolWei)}
              </div>
              <div style={{ fontSize: "11px", color: color.text.muted }}>
                {cycle.isFinalCycle
                  ? "Full Reward Pool (No Auction)"
                  : cycle.recipientAddress
                  ? `Recipient: ${cycle.recipientAddress.slice(0, 6)}...`
                  : "Auction Settlement"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
