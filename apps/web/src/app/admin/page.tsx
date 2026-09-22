"use client";

import React, { useEffect, useState } from "react";
import { color, radius, spacing, Button, Card, LoadingState, ErrorState, Badge } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { AdminShell } from "../../components/layout/AdminShell";
import { getAdminOverview } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import { useAuth } from "../../hooks/useAuth";
import { RefreshIcon } from "../../components/layout/Icons";

interface OverviewMetrics {
  totalUsers: number;
  totalPools: number;
  formingGroups: number;
  activeGroups: number;
  completedGroups: number;
  paymentOpenCycles: number;
  auctionOpenCycles: number;
  pendingContributions: number;
  paidContributions: number;
  lateContributions: number;
  recentAuditLogs: any[];
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminOverview();
      setData(res);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <AdminShell activeHref="/admin">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing["6"],
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>
              Admin Overview
            </h1>
            <Badge variant="info">SYSTEM OPERATIONAL</Badge>
          </div>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            Real-time monitoring of ROSCA pools, active cycles, contributions, and audit trails.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="secondary" onClick={fetchOverview} disabled={isLoading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </Button>
          <a href="/admin/pools" style={{ textDecoration: "none" }}>
            <Button variant="primary">+ Create Pool</Button>
          </a>
        </div>
      </div>

      {isLoading && <LoadingState message="Loading admin telemetry metrics..." />}

      {error && (
        <ErrorState
          title="Telemetry Load Failed"
          message={error}
          onRetry={fetchOverview}
        />
      )}

      {!isLoading && !error && data && (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing["6"] }}>
          {/* Key Metrics Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: spacing["4"],
            }}
          >
            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Total Users
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#FFFFFF", marginTop: "4px" }}>
                {data.totalUsers}
              </div>
              <div style={{ fontSize: "12px", color: color.text.secondary, marginTop: "4px" }}>
                Across Tiers 1–5
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Total Pools
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: color.brand.primary, marginTop: "4px" }}>
                {data.totalPools}
              </div>
              <div style={{ fontSize: "12px", color: color.text.secondary, marginTop: "4px" }}>
                Basic & Auction pools
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Forming Groups
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#eab308", marginTop: "4px" }}>
                {data.formingGroups}
              </div>
              <div style={{ fontSize: "12px", color: color.text.secondary, marginTop: "4px" }}>
                Waiting for members
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Active Groups
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: color.status.success, marginTop: "4px" }}>
                {data.activeGroups}
              </div>
              <div style={{ fontSize: "12px", color: color.text.secondary, marginTop: "4px" }}>
                Cycles executing
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Completed Groups
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: color.text.primary, marginTop: "4px" }}>
                {data.completedGroups}
              </div>
              <div style={{ fontSize: "12px", color: color.text.secondary, marginTop: "4px" }}>
                All cycles settled
              </div>
            </Card>
          </div>

          {/* Cycle & Contribution Telemetry */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: spacing["4"],
            }}
          >
            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Payment Open Cycles
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#38bdf8", marginTop: "4px" }}>
                {data.paymentOpenCycles}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Auction Open Cycles
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#a855f7", marginTop: "4px" }}>
                {data.auctionOpenCycles}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Pending Contributions
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#f59e0b", marginTop: "4px" }}>
                {data.pendingContributions}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Paid Contributions
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: color.status.success, marginTop: "4px" }}>
                {data.paidContributions}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                Late Contributions
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: color.status.error, marginTop: "4px" }}>
                {data.lateContributions}
              </div>
            </Card>
          </div>

          {/* Recent Audit Logs Section */}
          <Card>
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
                  Recent Audit Logs
                </h2>
                <p style={{ color: color.text.muted, margin: 0, fontSize: "13px" }}>
                  Immutable log of administrative and system lifecycle events
                </p>
              </div>
              <a href="/admin/audit" style={{ textDecoration: "none" }}>
                <Button variant="secondary" size="sm">
                  View All Logs →
                </Button>
              </a>
            </div>

            {data.recentAuditLogs.length === 0 ? (
              <div style={{ padding: spacing["6"], textAlign: "center", color: color.text.muted }}>
                No audit events recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                      <th style={{ padding: "10px" }}>TIMESTAMP</th>
                      <th style={{ padding: "10px" }}>ACTOR</th>
                      <th style={{ padding: "10px" }}>ACTION</th>
                      <th style={{ padding: "10px" }}>ENTITY</th>
                      <th style={{ padding: "10px" }}>METADATA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentAuditLogs.map((log: any) => (
                      <tr key={log.id} style={{ borderBottom: `1px solid ${color.border.subtle}` }}>
                        <td style={{ padding: "10px", color: color.text.secondary }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <Badge variant="neutral">{log.actorType}</Badge>
                        </td>
                        <td style={{ padding: "10px", fontWeight: 600 }}>
                          <Badge variant="info">{log.action}</Badge>
                        </td>
                        <td style={{ padding: "10px", color: color.text.secondary }}>
                          {log.entityType} {log.entityId ? `(#${log.entityId.slice(-6)})` : ""}
                        </td>
                        <td style={{ padding: "10px", color: color.text.muted, fontFamily: "monospace", fontSize: "12px" }}>
                          {log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminPage() {
  return (
    <AppProviders>
      <AdminDashboardContent />
    </AppProviders>
  );
}
