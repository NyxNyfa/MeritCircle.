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
import { getAdminPools, patchAdminPool } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error";
import { RefreshIcon, CheckIcon } from "../../../components/layout/Icons";

interface PoolItem {
  id: string;
  externalPoolId: string;
  name: string;
  description: string | null;
  mode: "BASIC" | "AUCTION";
  minimumTier: number;
  groupSize: number;
  cycleDurationDays: number;
  paymentWindowDays: number;
  auctionOpenDay: number | null;
  auctionCloseDay: number | null;
  settlementDay: number;
  contributionAmountWei: string;
  maxDiscountBps: number | null;
  status: "ACTIVE" | "PAUSED" | "CLOSED";
  groupsCount: number;
  createdAt: string;
}

function AdminPoolsContent() {
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPools();
      setPools(res.pools || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  const handleToggleStatus = async (pool: PoolItem) => {
    const nextStatus = pool.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await patchAdminPool(pool.id, { status: nextStatus });
      await fetchPools();
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <AdminShell activeHref="/admin/pools">
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
            Pool Catalog & Lifecycle Management
          </h1>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            Kelola ketersediaan blueprint pool ROSCA yang terdaftar secara on-chain di BNB Smart Chain Testnet.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="secondary" onClick={fetchPools} disabled={isLoading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* On-Chain Consensus Notice Banner */}
      <div
        style={{
          backgroundColor: "rgba(56, 189, 248, 0.08)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: radius.lg,
          padding: spacing["4"],
          marginBottom: spacing["6"],
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div style={{ color: "#38bdf8", marginTop: "2px" }}>
          <CheckIcon size={18} />
        </div>
        <div style={{ fontSize: "13px", lineHeight: "1.6", color: color.text.secondary }}>
          <strong style={{ color: "#38bdf8" }}>On-Chain Smart Contract Verified Blueprints:</strong> Seluruh pool arisan di bawah ini terdaftar dan diverifikasi secara on-chain pada smart contract BNB Smart Chain Testnet (<code style={{ color: "#38bdf8" }}>0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C</code>). Parameter konsensus seperti Tier, Ukuran Kelompok, dan Nominal Wei bersifat kekal (immutable) di blockchain demi menjaga keamanan dana anggota. Admin memiliki wewenang kontrol siklus untuk menonaktifkan sementara (<strong>Pause</strong>) atau mengaktifkan kembali (<strong>Activate</strong>) pool.
        </div>
      </div>

      {isLoading && <LoadingState message="Loading ROSCA pool catalog..." />}

      {error && (
        <ErrorState
          title="Pool Catalog Error"
          message={error}
          onRetry={fetchPools}
        />
      )}

      {!isLoading && !error && (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                  <th style={{ padding: "12px 10px" }}>POOL ID / NAME</th>
                  <th style={{ padding: "12px 10px" }}>MODE</th>
                  <th style={{ padding: "12px 10px" }}>MIN TIER</th>
                  <th style={{ padding: "12px 10px" }}>SIZE / CYCLES</th>
                  <th style={{ padding: "12px 10px" }}>CONTRIBUTION (WEI)</th>
                  <th style={{ padding: "12px 10px" }}>STATUS</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${color.border.subtle}` }}>
                    <td style={{ padding: "12px 10px" }}>
                      <div style={{ fontWeight: 700, color: "#FFFFFF" }}>{p.name}</div>
                      <div style={{ fontSize: "11px", color: color.text.muted }}>
                        {p.externalPoolId} • {p.groupsCount} active group(s)
                      </div>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <Badge variant={p.mode === "AUCTION" ? "info" : "neutral"}>
                        {p.mode}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <Badge variant="info">Tier {p.minimumTier}+</Badge>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      {p.groupSize} members ({p.cycleDurationDays}d/cycle)
                    </td>
                    <td style={{ padding: "12px 10px", fontFamily: "monospace", fontSize: "12px" }}>
                      {p.contributionAmountWei} wei
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <Badge variant={p.status === "ACTIVE" ? "success" : "warning"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
                      <Button
                        size="sm"
                        variant={p.status === "ACTIVE" ? "danger" : "secondary"}
                        onClick={() => handleToggleStatus(p)}
                      >
                        {p.status === "ACTIVE" ? "Pause" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}

export default function AdminPoolsPage() {
  return (
    <AppProviders>
      <AdminPoolsContent />
    </AppProviders>
  );
}
