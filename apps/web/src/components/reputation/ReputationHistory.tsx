"use client";

import React from "react";
import { color, radius, spacing, Card, Badge } from "@merit-circle/ui";
import { formatDate } from "../../lib/format";

export interface ReputationEvent {
  id: string;
  eventType: string;
  pointsDelta: number;
  reason?: string;
  createdAt: string;
}

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
        {events.map((ev) => {
          const isPositive = ev.pointsDelta >= 0;
          return (
            <div
              key={ev.id}
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
                    {ev.eventType}
                  </span>
                  <Badge variant={isPositive ? "success" : "danger"}>
                    {isPositive ? `+${ev.pointsDelta}` : `${ev.pointsDelta}`} pts
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
