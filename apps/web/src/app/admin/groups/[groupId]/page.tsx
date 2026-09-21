"use client";

import React, { useEffect, useState } from "react";
import {
  color,
  radius,
  spacing,
  Button,
  Card,
  LoadingState,
  ErrorState,
  Badge,
} from "@merit-circle/ui";
import { AppProviders } from "../../../../providers/AppProviders";
import { AdminShell } from "../../../../components/layout/AdminShell";
import { getAdminGroup, fillDemoGroup } from "../../../../lib/api";
import { getErrorMessage } from "../../../../lib/error";

function AdminGroupDetailContent({ initialGroupId }: { initialGroupId?: string }) {
  const [groupId, setGroupId] = useState<string>(initialGroupId || "");

  useEffect(() => {
    if (!groupId && typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/admin\/groups\/([^/]+)/);
      if (match && match[1]) {
        setGroupId(match[1]);
      }
    }
  }, [groupId]);

  const [group, setGroup] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Demo fill state
  const [isFilling, setIsFilling] = useState<boolean>(false);
  const [fillMessage, setFillMessage] = useState<string | null>(null);

  const fetchGroup = async () => {
    if (!groupId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminGroup(groupId);
      setGroup(res.group);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const handleFillDemo = async () => {
    if (!confirm("Demo Action: Are you sure you want to auto-fill this group with demo members and activate it?")) {
      return;
    }
    setIsFilling(true);
    setFillMessage(null);
    try {
      const res = await fillDemoGroup(groupId, "demo");
      setFillMessage(`Demo Success: Added ${res.demoMembersAdded} demo users and activated the group!`);
      await fetchGroup();
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setIsFilling(false);
    }
  };

  return (
    <AdminShell activeHref="/admin/groups">
      <div style={{ marginBottom: spacing["6"] }}>
        <a href="/admin/groups" style={{ color: color.text.muted, textDecoration: "none", fontSize: "13px" }}>
          ← Back to Groups Roster
        </a>
      </div>

      {isLoading && <LoadingState message="Loading group profile and cycle ledgers..." />}

      {error && (
        <ErrorState
          title="Group Load Error"
          message={error}
          onRetry={fetchGroup}
        />
      )}

      {!isLoading && !error && group && (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing["6"] }}>
          {/* Header Card */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0 }}>
                    {group.pool.name} #{group.groupNumber}
                  </h1>
                  <Badge
                    variant={
                      group.status === "ACTIVE"
                        ? "success"
                        : group.status === "FORMING"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {group.status}
                  </Badge>
                  <Badge variant="info">{group.pool.mode} POOL</Badge>
                </div>
                <div style={{ color: color.text.secondary, fontSize: "13px" }}>
                  Pool ID: {group.pool.externalPoolId} • Group Size: {group.pool.groupSize} • Current Cycle: {group.currentCycle} / {group.pool.groupSize}
                </div>
              </div>

              {/* DEMO ACTION BUTTON (Only for FORMING groups) */}
              {group.status === "FORMING" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                  <Button
                    variant="primary"
                    onClick={handleFillDemo}
                    disabled={isFilling}
                  >
                    {isFilling ? "Filling..." : "🤖 Fill group with demo users"}
                  </Button>
                  <span style={{ fontSize: "11px", color: "#f59e0b" }}>
                    ★ Demo Tool • Fills slots & activates cycles
                  </span>
                </div>
              )}
            </div>

            {fillMessage && (
              <div
                style={{
                  marginTop: spacing["4"],
                  padding: spacing["3"],
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: radius.md,
                  color: "#4ade80",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {fillMessage}
              </div>
            )}
          </Card>

          {/* Members Roster */}
          <Card>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: spacing["3"] }}>
              Members ({group.members.length} / {group.pool.groupSize})
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px" }}>SLOT</th>
                    <th style={{ padding: "8px 10px" }}>USER / WALLET</th>
                    <th style={{ padding: "8px 10px" }}>REPUTATION</th>
                    <th style={{ padding: "8px 10px" }}>TIER</th>
                    <th style={{ padding: "8px 10px" }}>PAYOUT RECEIVED</th>
                    <th style={{ padding: "8px 10px" }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${color.border.subtle}` }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>
                        Slot {m.payoutSlot || "—"}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ fontWeight: 600 }}>
                          {m.user?.profile?.username || "Anonymous"}
                        </div>
                        <div style={{ fontSize: "11px", color: color.text.muted, fontFamily: "monospace" }}>
                          {m.user?.walletAddress}
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px", color: color.brand.primary, fontWeight: 600 }}>
                        {m.user?.reputation?.points ?? 0} pts
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Badge variant="info">Tier {m.user?.reputation?.tier ?? 1}</Badge>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {m.hasReceivedPayout ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <Badge variant="neutral">Pending</Badge>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Badge variant="neutral">{m.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cycles & Auctions */}
          <Card>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: spacing["3"] }}>
              Cycles Timeline ({group.cycles.length} Total)
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px" }}>CYCLE #</th>
                    <th style={{ padding: "8px 10px" }}>STATUS</th>
                    <th style={{ padding: "8px 10px" }}>FINAL CYCLE</th>
                    <th style={{ padding: "8px 10px" }}>CONTRIBUTIONS</th>
                    <th style={{ padding: "8px 10px" }}>AUCTION</th>
                    <th style={{ padding: "8px 10px" }}>PAYOUT</th>
                  </tr>
                </thead>
                <tbody>
                  {group.cycles.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${color.border.subtle}` }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>
                        Cycle {c.cycleNumber}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Badge
                          variant={
                            c.status === "COMPLETED"
                              ? "success"
                              : c.status === "PAYMENT_OPEN"
                              ? "warning"
                              : c.status === "AUCTION_OPEN"
                              ? "info"
                              : "neutral"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {c.isFinalCycle ? (
                          <Badge variant="warning">FINAL (100% Payout)</Badge>
                        ) : (
                          "No"
                        )}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {c.contributions ? `${c.contributions.length} recorded` : "0"}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {c.auction ? (
                          <Badge variant="info">{c.auction.status} ({c.auction.bids?.length || 0} bids)</Badge>
                        ) : (
                          <span style={{ color: color.text.muted }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {c.payout ? (
                          <span style={{ fontFamily: "monospace", fontSize: "12px", color: color.status.success }}>
                            {c.payout.amountWei} wei
                          </span>
                        ) : (
                          <span style={{ color: color.text.muted }}>Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Reward Ledger */}
          <Card>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: spacing["3"] }}>
              Reward Carryover Ledger
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px" }}>CYCLE</th>
                    <th style={{ padding: "8px 10px" }}>BASE REWARD</th>
                    <th style={{ padding: "8px 10px" }}>CARRIED IN</th>
                    <th style={{ padding: "8px 10px" }}>REWARD POOL</th>
                    <th style={{ padding: "8px 10px" }}>PAYOUT</th>
                    <th style={{ padding: "8px 10px" }}>REMAINING CARRY</th>
                    <th style={{ padding: "8px 10px" }}>FINAL CYCLE</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rewardLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "16px", textAlign: "center", color: color.text.muted }}>
                        No settlement ledger entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    group.rewardLedgers.map((l: any) => (
                      <tr key={l.id} style={{ borderBottom: `1px solid ${color.border.subtle}`, fontFamily: "monospace", fontSize: "12px" }}>
                        <td style={{ padding: "8px 10px", fontFamily: "inherit", fontWeight: 700 }}>
                          #{l.cycleNumber}
                        </td>
                        <td style={{ padding: "8px 10px" }}>{l.baseRewardWei} wei</td>
                        <td style={{ padding: "8px 10px", color: "#38bdf8" }}>{l.carriedRewardWei} wei</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#FFFFFF" }}>{l.rewardPoolWei} wei</td>
                        <td style={{ padding: "8px 10px", color: color.status.success }}>{l.payoutWei} wei</td>
                        <td style={{ padding: "8px 10px", color: l.isFinalCycle ? color.status.success : "#f59e0b" }}>
                          {l.remainingCarryRewardWei} wei
                        </td>
                        <td style={{ padding: "8px 10px", fontFamily: "inherit" }}>
                          {l.isFinalCycle ? <Badge variant="success">Final (0 Remaining)</Badge> : "No"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminGroupDetailPage({ params }: { params?: { groupId?: string } }) {
  return (
    <AppProviders>
      <AdminGroupDetailContent initialGroupId={params?.groupId} />
    </AppProviders>
  );
}
