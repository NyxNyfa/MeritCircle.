"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { color, radius, spacing, Card, Badge, LoadingState } from "@merit-circle/ui";
import { AppProviders } from "../../../providers/AppProviders";
import { Shell } from "../../../components/layout/Shell";
import { getGroup, getGroupCycles, getRewardLedger } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error";
import { formatAddress, formatDate, formatWeiToBnb } from "../../../lib/format";
import { CycleTimeline, CycleInfo } from "../../../components/group/CycleTimeline";
import { ZapIcon, UserIcon } from "../../../components/layout/Icons";

function GroupHubContent({ initialGroupId }: { initialGroupId?: string }) {
  const routeParams = useParams();
  const [group, setGroup] = useState<any>(null);
  const [cycles, setCycles] = useState<CycleInfo[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let id = initialGroupId || (routeParams?.groupId as string);
    if (!id && typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      id = parts[parts.length - 1];
    }
    if (!id) return;

    Promise.all([
      getGroup(id),
      getGroupCycles(id),
      getRewardLedger(id).catch(() => ({ entries: [] })),
    ])
      .then(([groupRes, cyclesRes, ledgerRes]) => {
        // Backend returns the group object directly (not wrapped in { group: ... })
        const groupData = (groupRes as any).group || groupRes;
        setGroup(groupData);
        setCycles(cyclesRes.cycles || []);
        setLedger((ledgerRes as any).entries || (ledgerRes as any).ledger || []);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [initialGroupId, routeParams?.groupId]);

  if (isLoading) {
    return (
      <Shell activeHref="/dashboard">
        <LoadingState message="Memuat detail kelompok arisan..." />
      </Shell>
    );
  }

  if (error || !group) {
    return (
      <Shell activeHref="/dashboard">
        <Card
          style={{
            backgroundColor: color.status.errorBackground,
            border: `1px solid ${color.status.error}`,
            color: color.status.error,
            padding: spacing["6"],
            textAlign: "center",
          }}
        >
          {error || "Group not found"}
        </Card>
      </Shell>
    );
  }

  const isAuction =
    group.mode === "AUCTION" ||
    group.pool?.mode === "AUCTION" ||
    group.poolMode === "AUCTION";
  const isFinalCycle = group.currentCycleNumber >= group.totalCycles;

  return (
    <Shell activeHref="/dashboard">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing["6"] }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 800, margin: 0 }}>
              Group #{group.groupNumber} — {group.poolName || "ROSCA Circle"}
            </h1>
            <Badge variant={group.status === "ACTIVE" ? "success" : "neutral"}>
              {group.status}
            </Badge>
            <Badge variant={isAuction ? "info" : "neutral"}>
              {isAuction ? "AUCTION MODE" : "BASIC MODE"}
            </Badge>
          </div>
          <div style={{ fontSize: "13px", color: color.text.muted }}>
            ID: {group.id} • Current Cycle: {group.currentCycleNumber} of {group.totalCycles}
          </div>
        </div>

        {isAuction && !isFinalCycle && (
          <a
            href="/auction"
            style={{
              padding: "10px 20px",
              borderRadius: radius.md,
              backgroundColor: color.brand.primary,
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ZapIcon size={16} />
            <span>Masuk Ruang Lelang</span>
          </a>
        )}
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: spacing["8"] }}>
        {/* Left Column: Timeline & Ledger */}
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: spacing["4"] }}>
            Jadwal Siklus Bergilir
          </h2>
          <CycleTimeline
            cycles={cycles}
            currentCycleNumber={group.currentCycleNumber}
            isAuction={isAuction}
          />

          {/* Reward Ledger */}
          <div style={{ marginTop: spacing["8"] }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: spacing["4"] }}>
              Buku Besar Reward (Reward Ledger)
            </h2>

            {ledger.length === 0 ? (
              <Card
                style={{
                  backgroundColor: color.background.card,
                  border: `1px solid ${color.border.subtle}`,
                  padding: spacing["6"],
                  textAlign: "center",
                  color: color.text.muted,
                  fontSize: "13px",
                }}
              >
                Belum ada transaksi pencairan reward pada kelompok ini.
              </Card>
            ) : (
              <Card
                style={{
                  backgroundColor: color.background.card,
                  border: `1px solid ${color.border.subtle}`,
                  padding: spacing["4"],
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {ledger.map((entry: any) => (
                    <div
                      key={entry.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px",
                        borderBottom: `1px solid ${color.border.subtle}`,
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>Cycle #{entry.cycleNumber} Settlement</div>
                        <div style={{ fontSize: "11px", color: color.text.muted }}>
                          Penerima: {formatAddress(entry.recipientAddress)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: color.brand.accentElectric }}>
                          {formatWeiToBnb(entry.payoutAmountWei)}
                        </div>
                        {isAuction && entry.carriedRewardWei && (
                          <div style={{ fontSize: "11px", color: color.text.muted }}>
                            Carried surplus: {formatWeiToBnb(entry.carriedRewardWei)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Member List & Status Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: spacing["6"] }}>
          {/* Group Status Card */}
          <Card
            style={{
              backgroundColor: color.background.card,
              border: `1px solid ${color.border.subtle}`,
              padding: spacing["6"],
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, marginBottom: spacing["3"] }}>
              Status Kelompok
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              {isAuction ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: color.text.muted }}>Carried Reward:</span>
                  <span style={{ fontWeight: 700, color: color.brand.accentElectric }}>
                    {formatWeiToBnb(group.carriedRewardWei || "0")}
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: color.text.muted }}>Mekanisme Arisan:</span>
                  <span style={{ fontWeight: 600, color: color.text.primary }}>
                    Bergilir Reguler (Skor Reputasi)
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: color.text.muted }}>Status Siklus Final:</span>
                <span style={{ fontWeight: 600, color: isFinalCycle ? color.status.success : color.text.secondary }}>
                  {isFinalCycle ? "Aktif (Full Reward Pool)" : "Belum tercapai"}
                </span>
              </div>
            </div>
          </Card>

          {/* Members List */}
          <Card
            style={{
              backgroundColor: color.background.card,
              border: `1px solid ${color.border.subtle}`,
              padding: spacing["6"],
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, marginBottom: spacing["4"] }}>
              Daftar Anggota ({group.members?.length || 0} / {group.groupSize || group.maxMembers})
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(group.members || []).map((m: any, idx: number) => (
                <div
                  key={m.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: color.background.surface,
                    borderRadius: radius.md,
                    fontSize: "13px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <UserIcon size={14} />
                    <span>{m.username || formatAddress(m.walletAddress)}</span>
                  </div>
                  <Badge variant={m.hasReceivedPayout ? "success" : "neutral"}>
                    {m.hasReceivedPayout ? "Payout Received" : "Waiting"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

export default function GroupDetailPage({ params }: { params?: { groupId?: string } }) {
  return (
    <AppProviders>
      <GroupHubContent initialGroupId={params?.groupId} />
    </AppProviders>
  );
}
