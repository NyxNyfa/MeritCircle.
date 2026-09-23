"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { RefreshIcon } from "../../../components/layout/Icons";

interface GroupListItem {
  id: string;
  groupNumber: number;
  status: "FORMING" | "ACTIVE" | "COMPLETED";
  memberCount: number;
  currentCycle: number;
  startDate: string | null;
  createdAt: string;
  contractGroupId?: string | null;
  cyclesCount?: number;
  poolId?: string;
  poolName?: string;
  poolMode?: "BASIC" | "AUCTION";
  groupSize?: number;
  pool?: {
    id: string;
    externalPoolId: string;
    name: string;
    mode: "BASIC" | "AUCTION";
    groupSize: number;
    contributionAmountWei?: string;
  };
}

function AdminGroupsContent() {
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminGroups();
      setGroups(Array.isArray(res?.groups) ? res.groups : []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const pName = (g.pool?.name || g.poolName || "").toLowerCase();
      const extId = (g.pool?.externalPoolId || g.poolId || "").toLowerCase();
      const gId = (g.id || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        pName.includes(q) ||
        extId.includes(q) ||
        gId.includes(q) ||
        String(g.groupNumber).includes(q);

      const matchesStatus =
        statusFilter === "ALL" || g.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [groups, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = groups.length;
    const active = groups.filter((g) => g.status === "ACTIVE").length;
    const forming = groups.filter((g) => g.status === "FORMING").length;
    const completed = groups.filter((g) => g.status === "COMPLETED").length;
    return { total, active, forming, completed };
  }, [groups]);

  return (
    <AdminShell activeHref="/admin/groups">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing["6"],
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, marginBottom: "6px", color: "#FFFFFF" }}>
            ROSCA Groups Management
          </h1>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            Pilih dan kelola grup arisan, pantau siklus kontribusi, status keanggotaan, dan settlement on-chain.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={fetchGroups}
          disabled={isLoading}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <RefreshIcon size={14} />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: spacing["4"],
          marginBottom: spacing["6"],
        }}
      >
        <Card>
          <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total Grup
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#FFFFFF", marginTop: "4px" }}>
            {stats.total}
          </div>
          <div style={{ fontSize: "12px", color: color.text.secondary, marginTop: "4px" }}>
            Semua cohort arisan
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: "12px", color: color.status.success, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Grup Aktif
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: color.status.success, marginTop: "4px" }}>
            {stats.active}
          </div>
          <div style={{ fontSize: "12px", color: color.text.secondary, marginTop: "4px" }}>
            Siklus berjalan lancar
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: "12px", color: color.status.warning, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Forming Cohort
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: color.status.warning, marginTop: "4px" }}>
            {stats.forming}
          </div>
          <div style={{ fontSize: "12px", color: color.text.secondary, marginTop: "4px" }}>
            Menunggu kuota anggota
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Grup Selesai
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: color.text.secondary, marginTop: "4px" }}>
            {stats.completed}
          </div>
          <div style={{ fontSize: "12px", color: color.text.secondary, marginTop: "4px" }}>
            Telah tuntas seluruh siklus
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: spacing["4"],
          marginBottom: spacing["4"],
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["ALL", "ACTIVE", "FORMING", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "8px 16px",
                borderRadius: radius.md,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                borderColor: statusFilter === st ? color.brand.primary : color.border.subtle,
                backgroundColor: statusFilter === st ? "rgba(240, 185, 11, 0.15)" : color.background.surface,
                color: statusFilter === st ? color.brand.primary : color.text.secondary,
                transition: "all 0.2s ease",
              }}
            >
              {st === "ALL" ? "Semua Status" : st}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Cari nama pool, group #, atau ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: radius.md,
            border: `1px solid ${color.border.subtle}`,
            backgroundColor: color.background.surface,
            color: "#FFFFFF",
            fontSize: "13px",
            minWidth: "260px",
            outline: "none",
          }}
        />
      </div>

      {/* Main Content Area */}
      {isLoading && <LoadingState message="Memuat daftar grup arisan..." />}

      {error && (
        <ErrorState
          title="Gagal Memuat Grup"
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
                  <th style={{ padding: "14px 12px" }}>POOL / GRUP</th>
                  <th style={{ padding: "14px 12px" }}>STATUS</th>
                  <th style={{ padding: "14px 12px" }}>ANGGOTA</th>
                  <th style={{ padding: "14px 12px" }}>SIKLUS</th>
                  <th style={{ padding: "14px 12px" }}>ON-CHAIN ID</th>
                  <th style={{ padding: "14px 12px" }}>DIMULAI PADA</th>
                  <th style={{ padding: "14px 12px", textAlign: "right" }}>AKSI ADMIN</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: color.text.muted }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
                        Tidak ada grup yang sesuai
                      </div>
                      <div style={{ fontSize: "13px", color: color.text.secondary }}>
                        {searchQuery || statusFilter !== "ALL"
                          ? "Coba ganti filter atau kata kunci pencarian Anda."
                          : "Belum ada grup arisan yang terbentuk."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((g) => {
                    const poolName = g.pool?.name || g.poolName || "ROSCA Circle";
                    const poolMode = g.pool?.mode || g.poolMode || "BASIC";
                    const extPoolId = g.pool?.externalPoolId || g.poolId || "POOL";
                    const gSize = g.pool?.groupSize || g.groupSize || 3;
                    const contractId = g.contractGroupId || "-";

                    return (
                      <tr
                        key={g.id}
                        style={{
                          borderBottom: `1px solid ${color.border.subtle}`,
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "14px 12px" }}>
                          <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "14px" }}>
                            {poolName} #{g.groupNumber}
                          </div>
                          <div style={{ fontSize: "11px", color: color.text.muted, marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{extPoolId}</span>
                            <span>•</span>
                            <span
                              style={{
                                color: poolMode === "AUCTION" ? color.status.warning : color.brand.primary,
                                fontWeight: 600,
                              }}
                            >
                              {poolMode}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: "14px 12px" }}>
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

                        <td style={{ padding: "14px 12px" }}>
                          <div style={{ fontWeight: 600, color: "#FFFFFF" }}>
                            {g.memberCount} / {gSize}
                          </div>
                          <div
                            style={{
                              width: "60px",
                              height: "4px",
                              backgroundColor: "rgba(255,255,255,0.1)",
                              borderRadius: "2px",
                              marginTop: "4px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.round((g.memberCount / gSize) * 100))}%`,
                                height: "100%",
                                backgroundColor:
                                  g.memberCount >= gSize
                                    ? color.status.success
                                    : color.brand.primary,
                              }}
                            />
                          </div>
                        </td>

                        <td style={{ padding: "14px 12px" }}>
                          {g.status === "FORMING" ? (
                            <span style={{ color: color.text.muted }}>Menunggu penuh</span>
                          ) : (
                            <span style={{ fontWeight: 600, color: "#FFFFFF" }}>
                              Cycle {g.currentCycle} of {gSize}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "14px 12px" }}>
                          {contractId !== "-" ? (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: radius.sm,
                                backgroundColor: "rgba(240, 185, 11, 0.1)",
                                color: color.brand.primary,
                                fontSize: "12px",
                                fontFamily: "monospace",
                                fontWeight: 700,
                              }}
                            >
                              Group #{contractId}
                            </span>
                          ) : (
                            <span style={{ color: color.text.muted, fontSize: "12px" }}>Off-chain</span>
                          )}
                        </td>

                        <td style={{ padding: "14px 12px", color: color.text.secondary, fontSize: "12px" }}>
                          {g.startDate ? new Date(g.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Belum mulai"}
                        </td>

                        <td style={{ padding: "14px 12px", textAlign: "right" }}>
                          <a href={`/admin/groups/${g.id}`} style={{ textDecoration: "none" }}>
                            <Button size="sm" variant="primary">
                              Kelola & Settle →
                            </Button>
                          </a>
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

export default function AdminGroupsPage() {
  return (
    <AppProviders>
      <AdminGroupsContent />
    </AppProviders>
  );
}
