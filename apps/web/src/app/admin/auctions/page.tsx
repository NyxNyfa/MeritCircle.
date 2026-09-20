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
import { AppProviders } from "../../../providers/AppProviders";
import { AdminShell } from "../../../components/layout/AdminShell";
import {
  getAdminGroups,
  getAdminGroup,
  openAuction,
  closeAuction,
  settleCycle,
} from "../../../lib/api";

interface AuctionCycleItem {
  groupId: string;
  groupNumber: number;
  poolName: string;
  poolMode: string;
  cycleId: string;
  cycleNumber: number;
  isFinalCycle: boolean;
  cycleStatus: string;
  auction: any | null;
  payout: any | null;
}

function AdminAuctionsContent() {
  const [items, setItems] = useState<AuctionCycleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAuctions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const groupsRes = await getAdminGroups();
      const allGroups = groupsRes.groups || [];

      // Fetch cycles for active or forming groups
      const auctionCycles: AuctionCycleItem[] = [];
      for (const g of allGroups) {
        try {
          const detail = await getAdminGroup(g.id);
          const grp = detail.group;
          for (const c of grp.cycles || []) {
            auctionCycles.push({
              groupId: grp.id,
              groupNumber: grp.groupNumber,
              poolName: grp.pool.name,
              poolMode: grp.pool.mode,
              cycleId: c.id,
              cycleNumber: c.cycleNumber,
              isFinalCycle: c.isFinalCycle,
              cycleStatus: c.status,
              auction: c.auction,
              payout: c.payout,
            });
          }
        } catch {
          // ignore single group fetch fail
        }
      }

      // Sort by active / upcoming cycles
      auctionCycles.sort((a, b) => {
        if (a.cycleStatus === "AUCTION_OPEN") return -1;
        if (b.cycleStatus === "AUCTION_OPEN") return 1;
        if (a.cycleStatus === "PAYMENT_OPEN") return -1;
        if (b.cycleStatus === "PAYMENT_OPEN") return 1;
        return a.cycleNumber - b.cycleNumber;
      });

      setItems(auctionCycles);
    } catch (err: any) {
      setError(err?.message || "Failed to load cycles & auctions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const handleOpenAuction = async (cycleId: string) => {
    setActionInProgress(cycleId);
    setActionSuccess(null);
    try {
      await openAuction(cycleId);
      setActionSuccess(`Auction opened successfully for cycle #${cycleId.slice(-6)}`);
      await fetchAuctions();
    } catch (err: any) {
      alert(err?.message || "Failed to open auction");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCloseAuction = async (cycleId: string) => {
    setActionInProgress(cycleId);
    setActionSuccess(null);
    try {
      await closeAuction(cycleId);
      setActionSuccess(`Auction closed successfully for cycle #${cycleId.slice(-6)}`);
      await fetchAuctions();
    } catch (err: any) {
      alert(err?.message || "Failed to close auction");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSettleCycle = async (cycleId: string) => {
    setActionInProgress(cycleId);
    setActionSuccess(null);
    try {
      const res = await settleCycle(cycleId);
      setActionSuccess(
        `Cycle settled! Payout: ${res.settlement?.payoutWei} wei. Carried forward: ${res.settlement?.remainingCarryRewardWei} wei`
      );
      await fetchAuctions();
    } catch (err: any) {
      alert(err?.message || "Failed to settle cycle");
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <AdminShell activeHref="/admin/auctions">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing["6"],
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, marginBottom: "6px" }}>
            Auction & Settlement Operations
          </h1>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            Control bidding windows, monitor discount bids, and trigger cycle settlements and payouts.
          </p>
        </div>

        <Button variant="secondary" onClick={fetchAuctions} disabled={isLoading}>
          🔄 Refresh
        </Button>
      </div>

      {actionSuccess && (
        <div
          style={{
            marginBottom: spacing["4"],
            padding: spacing["3"],
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: radius.md,
            color: "#4ade80",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          ✓ {actionSuccess}
        </div>
      )}

      {isLoading && <LoadingState message="Loading auction state machines..." />}

      {error && (
        <ErrorState
          title="Auction Engine Error"
          message={error}
          onRetry={fetchAuctions}
        />
      )}

      {!isLoading && !error && (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                  <th style={{ padding: "12px 10px" }}>GROUP / POOL</th>
                  <th style={{ padding: "12px 10px" }}>CYCLE</th>
                  <th style={{ padding: "12px 10px" }}>CYCLE STATUS</th>
                  <th style={{ padding: "12px 10px" }}>AUCTION STATE</th>
                  <th style={{ padding: "12px 10px" }}>REWARD POOL</th>
                  <th style={{ padding: "12px 10px" }}>BIDS</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>ADMIN ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: color.text.muted }}>
                      No active cycles found. Create and start a group to begin auction cycles.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isAuctionPool = item.poolMode === "AUCTION";
                    const isBusy = actionInProgress === item.cycleId;

                    return (
                      <tr key={item.cycleId} style={{ borderBottom: `1px solid ${color.border.subtle}` }}>
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ fontWeight: 700, color: "#FFFFFF" }}>
                            {item.poolName} #{item.groupNumber}
                          </div>
                          <div style={{ fontSize: "11px", color: color.text.muted }}>
                            {item.poolMode}
                          </div>
                        </td>
                        <td style={{ padding: "12px 10px", fontWeight: 600 }}>
                          #{item.cycleNumber} {item.isFinalCycle && <Badge variant="warning">FINAL</Badge>}
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <Badge
                            variant={
                              item.cycleStatus === "COMPLETED"
                                ? "success"
                                : item.cycleStatus === "AUCTION_OPEN"
                                ? "info"
                                : item.cycleStatus === "PAYMENT_OPEN"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {item.cycleStatus}
                          </Badge>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          {item.isFinalCycle ? (
                            <span style={{ color: color.text.muted, fontSize: "12px" }}>
                              No Auction (Full Payout)
                            </span>
                          ) : isAuctionPool ? (
                            <Badge variant={item.auction?.status === "OPEN" ? "info" : "neutral"}>
                              {item.auction?.status || "NOT_OPEN"}
                            </Badge>
                          ) : (
                            <span style={{ color: color.text.muted, fontSize: "12px" }}>
                              Basic Pool (Random Slot)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 10px", fontFamily: "monospace", fontSize: "12px" }}>
                          {item.auction?.rewardPoolWei ? `${item.auction.rewardPoolWei} wei` : "—"}
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          {item.auction ? (
                            <span>{item.auction.bids?.length || 0} bids</span>
                          ) : (
                            <span style={{ color: color.text.muted }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 10px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                            {/* FINAL CYCLE RULES: Do NOT show open auction. Show final settlement action */}
                            {item.isFinalCycle ? (
                              item.cycleStatus !== "COMPLETED" ? (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  disabled={isBusy}
                                  onClick={() => handleSettleCycle(item.cycleId)}
                                >
                                  {isBusy ? "Settling..." : "🏁 Settle Final Cycle (100%)"}
                                </Button>
                              ) : (
                                <Badge variant="success">Settled</Badge>
                              )
                            ) : isAuctionPool ? (
                              <>
                                {item.cycleStatus === "PAYMENT_OPEN" && !item.auction && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={isBusy}
                                    onClick={() => handleOpenAuction(item.cycleId)}
                                  >
                                    Open Auction
                                  </Button>
                                )}
                                {item.auction?.status === "OPEN" && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={isBusy}
                                    onClick={() => handleCloseAuction(item.cycleId)}
                                  >
                                    Close Auction
                                  </Button>
                                )}
                                {(item.auction?.status === "CLOSED" || item.cycleStatus === "PAYMENT_OPEN") &&
                                  item.cycleStatus !== "COMPLETED" && (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      disabled={isBusy}
                                      onClick={() => handleSettleCycle(item.cycleId)}
                                    >
                                      Settle Cycle
                                    </Button>
                                  )}
                                {item.cycleStatus === "COMPLETED" && (
                                  <Badge variant="success">Settled</Badge>
                                )}
                              </>
                            ) : (
                              /* Basic pool */
                              item.cycleStatus !== "COMPLETED" ? (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  disabled={isBusy}
                                  onClick={() => handleSettleCycle(item.cycleId)}
                                >
                                  {isBusy ? "Settling..." : "Settle Cycle"}
                                </Button>
                              ) : (
                                <Badge variant="success">Settled</Badge>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}

export default function AdminAuctionsPage() {
  return (
    <AppProviders>
      <AdminAuctionsContent />
    </AppProviders>
  );
}
