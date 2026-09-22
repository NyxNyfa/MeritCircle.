"use client";

import React from "react";
import { color, radius, spacing, Card, Badge } from "@merit-circle/ui";
import { formatDate } from "../../lib/format";

export interface ReputationEvent {
  id?: string;
  eventType?: string;
  type?: string;
  pointsDelta?: number;
  points?: number;
  reason?: string;
  createdAt: string;
}

const EVENT_LABELS: Record<string, string> = {
  USERNAME_SET: "Username Configured",
  EMAIL_VERIFIED: "Email Verified",
  WALLET_CONNECTED: "Wallet Connected",
  SOCIAL_X_ADDED: "X (Twitter) Linked",
  SOCIAL_TELEGRAM_ADDED: "Telegram Linked",
  SOCIAL_DISCORD_ADDED: "Discord Linked",
  AVATAR_UPLOADED: "Avatar Uploaded",
  PROFILE_COMPLETED: "Profile Completed",
  JOIN_POOL: "Pool Joined",
  CONTRIBUTION_ON_TIME: "On-Time Contribution",
  CONTRIBUTION_EARLY_BONUS: "Early Contribution Bonus",
  CONTRIBUTION_LATE: "Late Contribution Penalty",
  CONTRIBUTION_UNPAID: "Default Penalty",
  GROUP_COMPLETED: "Group Completed",
  AUCTION_SUCCESSFULLY_REPAID: "Auction Repaid",
  ADMIN_ADJUSTMENT: "Administrative Adjustment",
};

export const ReputationHistory: React.FC<{ events: ReputationEvent[] }> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <Card
        style={{
          backgroundColor: color.background.card,
          border: `1px solid ${color.border.subtle}`,
          padding: spacing["8"],
          textAlign: "center",
          color: color.text.muted,
        }}
      >
        Belum ada riwayat aktivitas reputasi. Mulai dengan melengkapi profil atau bergabung ke pool!
      </Card>
    );
  }

  return (
    <Card
      style={{
        backgroundColor: color.background.card,
        border: `1px solid ${color.border.subtle}`,
        borderRadius: radius.lg,
        padding: spacing["6"],
      }}
    >
      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, marginBottom: spacing["4"] }}>
        Reputation Activity Ledger
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: spacing["3"] }}>
        {events.map((ev, idx) => {
          const rawType = ev.eventType || ev.type || "";
          const typeName = EVENT_LABELS[rawType] || rawType || ev.reason || "Reputation Event";
          const delta = Number(ev.pointsDelta ?? ev.points ?? 0);
          const badgeVariant = delta > 0 ? "success" : delta < 0 ? "danger" : "neutral";
          const badgeText = delta > 0 ? `+${delta} pts` : `${delta} pts`;
          return (
            <div
              key={ev.id || `${rawType}-${idx}-${ev.createdAt}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: spacing["3"],
                backgroundColor: color.background.surface,
                borderRadius: radius.md,
                border: `1px solid ${color.border.subtle}`,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px", color: color.text.primary }}>
                    {typeName}
                  </span>
                  <Badge variant={badgeVariant}>
                    {badgeText}
                  </Badge>
                </div>
                <div style={{ fontSize: "12px", color: color.text.muted, marginTop: "2px" }}>
                  {ev.reason || "Reputation point adjustment"}
                </div>
              </div>

              <div style={{ fontSize: "12px", color: color.text.muted }}>
                {formatDate(ev.createdAt)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
