"use client";

import React, { useEffect, useState } from "react";
import { color, radius, spacing, Card, Badge, Button, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { useAuth } from "../../hooks/useAuth";
import { useReputation } from "../../hooks/useReputation";
import { getMyGroups, getMyContributions } from "../../lib/api";
import { formatAddress, formatDate, formatPoint, formatTier, formatWeiToBnb } from "../../lib/format";
import { GroupCard, GroupData } from "../../components/group/GroupCard";

function DashboardContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { points, tier, maxActiveGroups, history } = useReputation();

  const [activeGroups, setActiveGroups] = useState<GroupData[]>([]);
  const [upcomingContributions, setUpcomingContributions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingData(false);
      return;
    }

    Promise.all([getMyGroups(), getMyContributions()])
      .then(([groupsRes, contribsRes]) => {
        setActiveGroups(groupsRes.groups || []);
        setUpcomingContributions(
          (contribsRes.contributions || []).filter(
            (c: any) => c.status === "PENDING"
          )
        );
      })
      .catch(() => {})
      .finally(() => {
        setLoadingData(false);
      });
  }, [isAuthenticated]);

  if (!isAuthenticated && !authLoading) {
    return (
      <Shell activeHref="/dashboard">
        <EmptyState
          title="Wallet Not Connected"
          description="Please connect your wallet to view your personal ROSCA dashboard, active circles, and reputation score."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                window.location.href = "/connect";
              }}
            >
              Connect Wallet
            </Button>
          }
        />
      </Shell>
    );
  }

  const nearestContribution = upcomingContributions[0];

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
              borderRadius: "16px",
              backgroundColor: "rgba(77, 142, 255, 0.15)",
              border: "2px solid rgba(77, 142, 255, 0.4)",
              boxShadow: "0 0 20px rgba(77, 142, 255, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
            }}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                style={{ width: "100%", height: "100%", borderRadius: "14px", objectFit: "cover" }}
              />
            ) : (
              "👤"
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
            <div style={{ fontSize: "12px", color: color.text.muted, marginTop: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
              {user?.walletAddress} • Group Capacity: {activeGroups.length}/{maxActiveGroups}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: "12px" }}>
          <a
            href="/pools"
            className="mc-button mc-button--primary"
            style={{
              padding: "10px 20px",
              borderRadius: radius.md,
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Explore Pools
          </a>
          <a
            href="/pay"
            className="mc-glass-interactive"
            style={{
              padding: "10px 20px",
              borderRadius: radius.md,
              color: color.text.primary,
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Pay Contribution
          </a>
        </div>
      </div>

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
            <span style={{ fontSize: "14px" }}>⭐</span>
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
            <span style={{ fontSize: "14px" }}>🔄</span>
          </div>
          <div
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
            <span style={{ fontSize: "14px" }}>💳</span>
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
            <span style={{ fontSize: "14px" }}>⚡</span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: color.brand.accentElectric, marginBottom: "6px" }}>
            {activeGroups.some((g) => g.mode === "AUCTION") ? "Active Auction" : "Standard Pools"}
          </div>
          <div style={{ fontSize: "11px", color: color.text.muted, marginTop: "10px" }}>
            Carried reward enabled
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: spacing["8"] }}>
        {/* Active Groups List */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing["4"],
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>My Active Circles</h2>
            <a href="/pools" style={{ fontSize: "13px", color: color.brand.primary, textDecoration: "none" }}>
              Join More Pools →
            </a>
          </div>

          {activeGroups.length === 0 ? (
            <Card
              style={{
                backgroundColor: color.background.card,
                border: `1px solid ${color.border.subtle}`,
                padding: spacing["8"],
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🪙</div>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>No Active Circles Yet</div>
              <p style={{ fontSize: "13px", color: color.text.secondary, marginBottom: spacing["4"] }}>
                Browse the marketplace and join a rotating circle that matches your financial tier.
              </p>
              <a
                href="/pools"
                style={{
                  display: "inline-block",
                  padding: "8px 18px",
                  borderRadius: radius.md,
                  backgroundColor: color.brand.primary,
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Browse Pools
              </a>
            </Card>
          ) : (
            activeGroups.map((grp) => <GroupCard key={grp.id} group={grp} />)
          )}
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
                {history.slice(0, 5).map((ev: any) => (
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
                      <div style={{ fontWeight: 600, color: color.text.primary }}>{ev.eventType}</div>
                      <div style={{ color: color.text.muted }}>{formatDate(ev.createdAt)}</div>
                    </div>
                    <span
                      style={{
                        fontWeight: 700,
                        color: ev.pointsDelta >= 0 ? color.status.success : color.status.error,
                      }}
                    >
                      {ev.pointsDelta >= 0 ? `+${ev.pointsDelta}` : ev.pointsDelta} pts
                    </span>
                  </div>
                ))}
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
