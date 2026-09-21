"use client";

import React from "react";
import { color, radius, spacing, Card, Badge } from "@merit-circle/ui";
import { formatWeiToBnb, formatDate } from "../../lib/format";

export interface GroupData {
  id: string;
  groupNumber: number;
  poolId: string;
  poolName: string;
  mode: "BASIC" | "AUCTION";
  status: "FORMING" | "ACTIVE" | "COMPLETED";
  currentCycleNumber: number;
  totalCycles: number;
  membersCount: number;
  maxMembers: number;
  carriedRewardWei: string;
  nextPaymentDueDate?: string;
}

export const GroupCard: React.FC<{ group: GroupData }> = ({ group }) => {
  const isAuction = group.mode === "AUCTION";
  const isFinalCycle = group.currentCycleNumber >= group.totalCycles;

  return (
    <Card
      liquid
      variant={isAuction ? "cyan" : "liquid"}
      style={{
        borderRadius: radius.xl,
        padding: spacing["6"],
        marginBottom: spacing["4"],
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing["4"] }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: color.text.primary }}>
              Group #{group.groupNumber} — {group.poolName}
            </span>
            <Badge variant={group.status === "ACTIVE" ? "success" : "neutral"}>
              {group.status}
            </Badge>
            <Badge variant={isAuction ? "info" : "neutral"}>
              {group.mode}
            </Badge>
          </div>
          <div style={{ fontSize: "12px", color: color.text.muted }}>
            Members: {group.membersCount}/{group.maxMembers} • Current Cycle: {group.currentCycleNumber} of {group.totalCycles}
          </div>
        </div>

        <a
          href={`/groups/${group.id}`}
          style={{
            padding: "8px 16px",
            borderRadius: radius.md,
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${color.border.subtle}`,
            color: color.text.primary,
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            transition: "all 0.2s ease",
          }}
        >
          View Group Hub →
        </a>
      </div>

      {/* Cycle Progress & Carryover Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: spacing["3"],
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
          <div style={{ color: color.text.muted, marginBottom: "2px" }}>Next Contribution Due</div>
          <div style={{ fontWeight: 600, color: color.text.primary }}>
            {formatDate(group.nextPaymentDueDate)}
          </div>
        </div>

        <div>
          <div style={{ color: color.text.muted, marginBottom: "2px" }}>
            {isFinalCycle ? "Final Cycle Status" : "Carried Reward to Next Cycle"}
          </div>
          <div
            style={{
              fontWeight: 700,
              color: isFinalCycle ? color.status.success : color.brand.accentElectric,
            }}
          >
            {isFinalCycle ? "Full Reward Payout (0 Carryover)" : formatWeiToBnb(group.carriedRewardWei)}
          </div>
        </div>
      </div>
    </Card>
  );
};
