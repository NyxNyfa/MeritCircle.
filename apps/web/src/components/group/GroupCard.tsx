"use client";

import React from "react";
import { color, radius, spacing, Card, Badge } from "@merit-circle/ui";
import type { GroupData } from "../../lib/api";
import { formatWeiToBnb, formatDate } from "../../lib/format";

export const GroupCard: React.FC<{ group: GroupData }> = ({ group }) => {
  const isAuction = group.mode === "AUCTION";
  const isCompleted =
    group.status === "COMPLETED" ||
    group.memberStatus === "COMPLETED" ||
    group.isGroupCompleted === true;
  const lifecycleStatus = isCompleted ? "COMPLETED" : group.status;
  const isFinalCycle = group.currentCycleNumber === group.totalCycles;

  return (
    <Card
      liquid
      variant={isAuction ? "cyan" : "liquid"}
      data-testid={`group-card-${group.id}`}
      data-group-status={lifecycleStatus}
      style={{
        borderRadius: radius.xl,
        padding: spacing["6"],
        marginBottom: spacing["4"],
        border: isCompleted
          ? "1px solid rgba(0, 229, 153, 0.3)"
          : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing["4"] }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: color.text.primary }}>
              Group #{group.groupNumber} — {group.poolName}
            </span>
            <Badge variant={lifecycleStatus === "FORMING" ? "neutral" : "success"}>
              {lifecycleStatus}
            </Badge>
            <Badge variant={isAuction ? "info" : "neutral"}>
              {group.mode}
            </Badge>
          </div>
          <div style={{ fontSize: "12px", color: color.text.muted }}>
            {isCompleted ? (
              <>
                All {group.totalCycles} cycles completed • Completed on {formatDate(group.completedAt)}
              </>
            ) : (
              <>Members: {group.membersCount}/{group.maxMembers} • Current Cycle: {group.currentCycleNumber} of {group.totalCycles}</>
            )}
          </div>
        </div>

        <a
          href={`/groups/${group.id}`}
          className="mc-glass-interactive"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 18px",
            borderRadius: "9999px",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${color.border.subtle}`,
            color: color.text.primary,
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          }}
        >
          View Group Hub →
        </a>
      </div>

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
          <div style={{ color: color.text.muted, marginBottom: "2px" }}>
            {isCompleted ? "Completed At" : "Next Contribution Due"}
          </div>
          <div style={{ fontWeight: 600, color: color.text.primary }}>
            {isCompleted ? formatDate(group.completedAt) : formatDate(group.nextPaymentDueDate)}
          </div>
        </div>

        <div>
          <div style={{ color: color.text.muted, marginBottom: "2px" }}>
            {isCompleted ? "Final Settlement" : isFinalCycle ? "Final Cycle Status" : "Carried Reward to Next Cycle"}
          </div>
          <div
            style={{
              fontWeight: 700,
              color: isCompleted || isFinalCycle ? color.status.success : color.brand.accentElectric,
            }}
          >
            {isCompleted
              ? "All cycles settled"
              : isFinalCycle
              ? "Payout on settlement"
              : formatWeiToBnb(group.carriedRewardWei)}
          </div>
        </div>
      </div>
    </Card>
  );
};
