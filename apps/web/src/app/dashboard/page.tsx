"use client";

import React, { useEffect, useState } from "react";
import { color, radius, spacing, Card, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { useAuth } from "../../hooks/useAuth";
import { useReputation } from "../../hooks/useReputation";
import { getMyGroups, getMyContributions } from "../../lib/api";
import type { GroupData } from "../../lib/api";
import { formatAddress, formatDate, formatPoint, formatTier, formatWeiToBnb } from "../../lib/format";
import { GroupCard } from "../../components/group/GroupCard";
import { LiquidMetalButton } from "../../components/ui/liquid-metal-button";
import {
  ZapIcon,
  UserIcon,
  RefreshIcon,
  CreditCardIcon,
  CoinsIcon,
  StarIcon,
} from "../../components/layout/Icons";

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

type GroupTab = "active" | "history";

function isActiveGroup(group: GroupData): boolean {
  return (
    (group.memberStatus ?? "ACTIVE") === "ACTIVE" &&
    (group.status === "FORMING" || group.status === "ACTIVE") &&
    group.isGroupCompleted !== true
  );
}

function isCompletedGroup(group: GroupData): boolean {
  return (
    group.status === "COMPLETED" ||
    group.memberStatus === "COMPLETED" ||
    group.isGroupCompleted === true
  );
}

function DashboardContent() {
  const { user, isAuthenticated, isLoading: authLoading, loginWithWallet } = useAuth();
  const { points, tier, maxActiveGroups, history } = useReputation();

  const [activeGroups, setActiveGroups] = useState<GroupData[]>([]);
  const [completedGroups, setCompletedGroups] = useState<GroupData[]>([]);
  const [selectedGroupTab, setSelectedGroupTab] = useState<GroupTab>("active");
  const [upcomingContributions, setUpcomingContributions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !user) {
      setActiveGroups([]);
      setCompletedGroups([]);
      setSelectedGroupTab("active");
      setUpcomingContributions([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    Promise.allSettled([getMyGroups(), getMyContributions()])
      .then(([groupsResult, contributionsResult]) => {
        if (cancelled) return;

        if (groupsResult.status === "rejected") {
          setActiveGroups([]);
          setCompletedGroups([]);
          setSelectedGroupTab("active");
          setUpcomingContributions([]);
          return;
        }

        const groupsRes = groupsResult.value;
        const activeSource = groupsRes.activeGroups ?? groupsRes.groups;
        const completedSource = groupsRes.completedGroups ?? groupsRes.groups;
        const nextActiveGroups = activeSource.filter(isActiveGroup);
        const nextCompletedGroups = completedSource.filter(isCompletedGroup);
        const activeGroupIds = new Set(nextActiveGroups.map((group) => group.id));
        const contributions =
          contributionsResult.status === "fulfilled"
            ? contributionsResult.value.contributions
            : [];

        setActiveGroups(nextActiveGroups);
        setCompletedGroups(nextCompletedGroups);
        setSelectedGroupTab((currentTab) =>
          currentTab === "active" &&
          nextActiveGroups.length === 0 &&
          nextCompletedGroups.length > 0
            ? "history"
            : currentTab
        );
        setUpcomingContributions(
          (contributions || []).filter(
            (contribution: any) =>
              contribution.status === "PENDING" &&
              activeGroupIds.has(contribution.groupId)
          )
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, user?.walletAddress]);

  if (!isAuthenticated && !authLoading) {
    return (
      <Shell activeHref="/dashboard">
        <EmptyState
          title="Dompet Belum Terhubung"
          description="Silakan hubungkan dompet Web3 Anda untuk mengakses dashboard personal, kelompok arisan aktif, dan reputasi on-chain."
          action={
            <LiquidMetalButton
              size="md"
              variant="primary"
              onClick={loginWithWallet}
              icon={<ZapIcon size={16} />}
            >
              Connect Wallet
            </LiquidMetalButton>
          }
        />
      </Shell>
    );
  }

  const isPayableContribution = (c: any) => {
    if (c.status !== "PENDING") return false;
    // Prioritize server-side isPayable flag (most reliable)
    if (c.isPayable === true) return true;
    // Strict cycle status check
    if (c.cycleStatus === "PAYMENT_OPEN") return true;
    // Only use cycleNumber comparison if groupCurrentCycle is explicitly available (no fallback to 1)
    if (c.groupCurrentCycle && c.cycleNumber === c.groupCurrentCycle) return true;
    return false;
  };


  const activeDueContribution = upcomingContributions.find(isPayableContribution);
  const nearestContribution = activeDueContribution || upcomingContributions[0];
  const displayedGroups =
    selectedGroupTab === "active" ? activeGroups : completedGroups;

  return (
    <Shell activeHref="/dashboard">
      {/* Welcome Banner */}
      <div
        className="mc-glass"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing["6"],
          padding: "24px 28px",
          borderRadius: radius.xl,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(77, 142, 255, 0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "20px",
              backgroundColor: "rgba(77, 142, 255, 0.15)",
              border: "2px solid rgba(77, 142, 255, 0.4)",
              boxShadow: "0 0 20px rgba(77, 142, 255, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: color.brand.primary,
            }}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                style={{ width: "100%", height: "100%", borderRadius: "18px", objectFit: "cover" }}
              />
            ) : (
              <UserIcon size={24} />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, color: color.text.white, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Welcome, {user?.username || formatAddress(user?.walletAddress)}
              </h1>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "3px 12px",
                  borderRadius: radius.full,
                  backgroundColor: "rgba(0, 229, 255, 0.15)",
                  color: "#00E5FF",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                }}
              >
                {formatTier(tier)}
              </span>
            </div>
            <div data-testid="group-capacity" style={{ fontSize: "12px", color: color.text.muted, marginTop: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
              {user?.walletAddress} • Group Capacity: {activeGroups.length}/{maxActiveGroups}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <LiquidMetalButton
            href="/pools"
            size="sm"
            variant="primary"
          >
            Explore Pools
          </LiquidMetalButton>
          <LiquidMetalButton
            href="/pay"
            size="sm"
            variant="cyan"
          >
            Pay Contribution
          </LiquidMetalButton>
        </div>
      </div>

      {/* Active Group & Pending Due Action Banner */}
      {nearestContribution && (
        <div
          className="mc-glass"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderRadius: radius.lg,
            border: "1px solid rgba(0, 229, 255, 0.4)",
            backgroundColor: "rgba(0, 229, 255, 0.08)",
            marginBottom: spacing["6"],
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, color: color.text.white, fontSize: "15px" }}>
                {nearestContribution.poolName ? `${nearestContribution.poolName} — ` : ""}Tagihan Siklus #{nearestContribution.cycleNumber} Siap Disetor
              </div>
              <div style={{ fontSize: "12px", color: color.text.muted }}>
                Nominal: {formatWeiToBnb(nearestContribution.amountWei)} • Jatuh tempo: {formatDate(nearestContribution.dueDate)}
                {nearestContribution.groupNumber ? ` • Group #${nearestContribution.groupNumber}` : ""}
              </div>
            </div>
          </div>
          <LiquidMetalButton
            href="/pay"
            size="sm"
            variant="cyan"
          >
            Bayar via MetaMask (tBNB) →
          </LiquidMetalButton>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: spacing["4"],
          marginBottom: spacing["8"],
        }}
      >
        <div
          className="mc-liquid-glass mc-liquid-cyan"
          style={{
            padding: "22px",
            borderRadius: radius.xl,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", color: color.text.muted, fontWeight: 500 }}>Reputation Score</span>
            <StarIcon size={16} />
          </div>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: color.brand.accentElectric,
              fontFamily: "'JetBrains Mono', monospace",
              textShadow: "0 0 16px rgba(0, 229, 255, 0.4)",
              marginBottom: "6px",
            }}
          >
            {formatPoint(points)}
          </div>
          {/* Progress Bar towards 1000 */}
          <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "6px" }}>
            <div style={{ width: `${Math.min(100, (points / 1000) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #4D8EFF, #00E5FF)", boxShadow: "0 0 8px rgba(0,229,255,0.5)" }} />
          </div>
          <div style={{ fontSize: "11px", color: color.text.muted }}>
            Tier {tier} • Max {1000} Pts
          </div>
        </div>

        <div
          className="mc-liquid-glass"
          style={{
            padding: "22px",
            borderRadius: radius.xl,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", color: color.text.muted, fontWeight: 500 }}>Active ROSCAs</span>
            <RefreshIcon size={16} />
          </div>
          <div
            data-testid="active-roscas-count"
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: color.text.white,
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: "6px",
            }}
          >
            {activeGroups.length} <span style={{ fontSize: "16px", color: color.text.muted }}>/ {maxActiveGroups}</span>
          </div>
          <div style={{ fontSize: "11px", color: color.text.muted, marginTop: "10px" }}>
            Parallel limit by Tier {tier}
          </div>
        </div>

        <div
          className="mc-liquid-glass mc-liquid-gold"
          style={{
            padding: "22px",
            borderRadius: radius.xl,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", color: color.text.muted, fontWeight: 500 }}>Next Contribution</span>
            <CreditCardIcon size={16} />
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: nearestContribution ? color.status.warning : color.status.success,
              marginBottom: "6px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {nearestContribution ? formatWeiToBnb(nearestContribution.amountWei) : "Settled"}
          </div>
          <div style={{ fontSize: "11px", color: color.text.muted, marginTop: "10px" }}>
            {nearestContribution ? `Due: ${formatDate(nearestContribution.dueDate)}` : "All contributions paid"}
          </div>
        </div>

        <div
          className="mc-liquid-glass"
          style={{
            padding: "22px",
            borderRadius: radius.xl,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", color: color.text.muted, fontWeight: 500 }}>Auction & Surplus</span>
            <ZapIcon size={16} />
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: color.brand.accentElectric, marginBottom: "6px" }}>
            {activeGroups.some((g) => g.mode === "AUCTION") ? "Active Auction" : "Standard Pools"}
          </div>
          <div style={{ fontSize: "11px", color: color.text.muted, marginTop: "10px" }}>
            Carried reward enabled
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: spacing["8"] }}>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing["4"],
            }}
          >
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>
                {selectedGroupTab === "active" ? "My Active Pools" : "Completed Pool History"}
              </h2>
              <p style={{ fontSize: "12px", color: color.text.muted, margin: "4px 0 0" }}>
                {selectedGroupTab === "active"
                  ? "Pools that are still forming or running."
                  : "Pools moved here automatically after the final cycle is settled."}
              </p>
            </div>
            {selectedGroupTab === "active" && (
              <a href="/pools" style={{ fontSize: "13px", color: color.brand.primary, textDecoration: "none" }}>
                Join More Pools →
              </a>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Pool status"
            data-testid="dashboard-pool-tabs"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
              padding: "4px",
              marginBottom: spacing["4"],
              borderRadius: radius.full,
              backgroundColor: "rgba(12, 16, 28, 0.72)",
              border: `1px solid ${color.border.subtle}`,
            }}
          >
            {(
              [
                { id: "active" as const, label: "Active Pools", count: activeGroups.length },
                { id: "history" as const, label: "History / Completed", count: completedGroups.length },
              ] satisfies Array<{ id: GroupTab; label: string; count: number }>
            ).map((tab) => {
              const isSelected = selectedGroupTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`dashboard-group-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`dashboard-group-panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  disabled={loadingData}
                  onClick={() => setSelectedGroupTab(tab.id)}
                  style={{
                    border: isSelected
                      ? "1px solid rgba(77, 142, 255, 0.45)"
                      : "1px solid transparent",
                    borderRadius: radius.full,
                    padding: "10px 16px",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(77, 142, 255, 0.32), rgba(0, 229, 255, 0.22))"
                      : "transparent",
                    color: isSelected ? color.text.white : color.text.muted,
                    fontSize: "13px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: loadingData ? "wait" : "pointer",
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`dashboard-group-panel-${selectedGroupTab}`}
            aria-labelledby={`dashboard-group-tab-${selectedGroupTab}`}
            aria-busy={loadingData}
            data-testid={`${selectedGroupTab}-groups-panel`}
          >
            {displayedGroups.length === 0 ? (
              <Card
                data-testid={
                  selectedGroupTab === "active"
                    ? "active-groups-empty"
                    : "completed-groups-empty"
                }
                style={{
                  backgroundColor: color.background.card,
                  border: `1px solid ${color.border.subtle}`,
                  padding: spacing["8"],
                  textAlign: "center",
                }}
              >
                <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center", color: selectedGroupTab === "history" ? color.status.success : color.brand.primary }}>
                  <CoinsIcon size={36} />
                </div>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                  {selectedGroupTab === "active" ? "No Active Pools Yet" : "No Completed Pools Yet"}
                </div>
                <p style={{ fontSize: "13px", color: color.text.secondary, marginBottom: selectedGroupTab === "active" ? spacing["4"] : 0 }}>
                  {selectedGroupTab === "active"
                    ? "Browse the marketplace and join a rotating pool that matches your financial tier."
                    : "A pool will appear here after its final cycle has been fully settled."}
                </p>
                {selectedGroupTab === "active" && (
                  <LiquidMetalButton
                    href="/pools"
                    size="sm"
                    variant="primary"
                  >
                    Browse Pools
                  </LiquidMetalButton>
                )}
              </Card>
            ) : (
              <div role="list">
                {displayedGroups.map((group) => (
                  <div role="listitem" key={group.id}>
                    <GroupCard group={group} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reputation Activity Sidebar */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing["4"],
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Recent Activity</h2>
            <a href="/reputation" style={{ fontSize: "13px", color: color.brand.primary, textDecoration: "none" }}>
              View All →
            </a>
          </div>

          <Card
            style={{
              backgroundColor: color.background.card,
              border: `1px solid ${color.border.subtle}`,
              padding: spacing["4"],
            }}
          >
            {history.length === 0 ? (
              <div style={{ fontSize: "13px", color: color.text.muted, textAlign: "center", padding: spacing["4"] }}>
                No events recorded yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: spacing["3"] }}>
                {history.slice(0, 5).map((ev: any) => {
                  const rawType = ev.eventType || ev.type || "";
                  const typeName = EVENT_LABELS[rawType] || rawType || ev.reason || "Reputation Event";
                  const delta = Number(ev.pointsDelta ?? ev.points ?? 0);
                  const isPositive = delta > 0;
                  const deltaText = isPositive ? `+${delta} pts` : `${delta} pts`;

                  return (
                    <div
                      key={ev.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: "8px",
                        borderBottom: `1px solid ${color.border.subtle}`,
                        fontSize: "12px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: color.text.primary }}>{typeName}</div>
                        <div style={{ color: color.text.muted }}>{formatDate(ev.createdAt)}</div>
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: delta > 0 ? color.status.success : delta < 0 ? color.status.error : color.text.muted,
                        }}
                      >
                        {deltaText}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}

export default function DashboardPage() {
  return (
    <AppProviders>
      <DashboardContent />
    </AppProviders>
  );
}
