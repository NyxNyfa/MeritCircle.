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
import { getAdminGroups } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error";

interface GroupListItem {
  id: string;
  groupNumber: number;
  status: "FORMING" | "ACTIVE" | "COMPLETED";
  memberCount: number;
  currentCycle: number;
  startDate: string | null;
  createdAt: string;
  pool: {
    id: string;
    externalPoolId: string;
    name: string;
    mode: "BASIC" | "AUCTION";
    groupSize: number;
  };
}

function AdminGroupsContent() {
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminGroups();
      setGroups(res.groups || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <AdminShell activeHref="/admin/groups">
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
            ROSCA Groups Roster
          </h1>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            Monitor active ROSCA rotating circles, forming cohorts, cycle progressions, and member slots.
          </p>
        </div>

        <Button variant="secondary" onClick={fetchGroups} disabled={isLoading}>
          🔄 Refresh
        </Button>
      </div>

      {isLoading && <LoadingState message="Loading ROSCA groups registry..." />}

      {error && (
        <ErrorState
          title="Groups Registry Error"
          message={error}
          onRetry={fetchGroups}
        />
      )}

      {!isLoading && !error && (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                  <th style={{ padding: "12px 10px" }}>POOL / GROUP</th>
                  <th style={{ padding: "12px 10px" }}>STATUS</th>
                  <th style={{ padding: "12px 10px" }}>MEMBERS</th>
                  <th style={{ padding: "12px 10px" }}>CYCLE</th>
                  <th style={{ padding: "12px 10px" }}>STARTED AT</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: color.text.muted }}>
                      No groups exist yet. Users can form groups by joining pools, or you can run demo seed.
                    </td>
                  </tr>
                ) : (
                  groups.map((g) => (
                    <tr key={g.id} style={{ borderBottom: `1px solid ${color.border.subtle}` }}>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ fontWeight: 700, color: "#FFFFFF" }}>
                          {g.pool.name} #{g.groupNumber}
                        </div>
                        <div style={{ fontSize: "11px", color: color.text.muted }}>
                          {g.pool.externalPoolId} • {g.pool.mode}
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <Badge
                          variant={
                            g.status === "ACTIVE"
                              ? "success"
                              : g.status === "FORMING"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {g.status}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        {g.memberCount} / {g.pool.groupSize}
                      </td>
                      <td style={{ padding: "12px 10px", fontWeight: 600 }}>
                        {g.status === "FORMING"
                          ? "Waiting"
                          : `Cycle ${g.currentCycle} of ${g.pool.groupSize}`}
                      </td>
                      <td style={{ padding: "12px 10px", color: color.text.secondary }}>
                        {g.startDate ? new Date(g.startDate).toLocaleDateString() : "Not started"}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        <a href={`/admin/groups/${g.id}`} style={{ textDecoration: "none" }}>
                          <Button size="sm" variant="secondary">
                            View Details →
                          </Button>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}

export default function AdminGroupsPage() {
  return (
    <AppProviders>
      <AdminGroupsContent />
    </AppProviders>
  );
}
