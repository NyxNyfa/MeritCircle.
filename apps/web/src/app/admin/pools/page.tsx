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
  Modal,
  Input,
  Select,
} from "@merit-circle/ui";
import { AppProviders } from "../../../providers/AppProviders";
import { AdminShell } from "../../../components/layout/AdminShell";
import { getAdminPools, createAdminPool, patchAdminPool } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error";

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

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    externalPoolId: "",
    name: "",
    description: "",
    mode: "BASIC" as "BASIC" | "AUCTION",
    minimumTier: 2,
    groupSize: 3,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: 11,
    auctionCloseDay: 20,
    settlementDay: 30,
    contributionAmountWei: "1000000000000000",
    maxDiscountBps: 1000,
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: any = {
        externalPoolId: createForm.externalPoolId.trim().toUpperCase(),
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        mode: createForm.mode,
        minimumTier: Number(createForm.minimumTier),
        groupSize: Number(createForm.groupSize),
        cycleDurationDays: Number(createForm.cycleDurationDays),
        paymentWindowDays: Number(createForm.paymentWindowDays),
        settlementDay: Number(createForm.settlementDay),
        contributionAmountWei: createForm.contributionAmountWei.trim(),
        status: "ACTIVE",
      };

      if (createForm.mode === "AUCTION") {
        payload.auctionOpenDay = Number(createForm.auctionOpenDay);
        payload.auctionCloseDay = Number(createForm.auctionCloseDay);
        payload.maxDiscountBps = Number(createForm.maxDiscountBps);
      } else {
        payload.auctionOpenDay = null;
        payload.auctionCloseDay = null;
        payload.maxDiscountBps = null;
      }

      await createAdminPool(payload);
      await fetchPools();
      setIsCreateOpen(false);
    } catch (err: any) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
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
            Configure ROSCA pool blueprints, tier requirements, auction rules, and availability.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="secondary" onClick={fetchPools} disabled={isLoading}>
            🔄 Refresh
          </Button>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            + Create New Pool
          </Button>
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

      {/* Create Pool Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => !isSubmitting && setIsCreateOpen(false)}
          title="Create New ROSCA Pool"
        >
          <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: spacing["3"] }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                External Pool ID
              </label>
              <Input
                type="text"
                placeholder="e.g. CIT-4 or PRM-A3"
                value={createForm.externalPoolId}
                onChange={(e) => setCreateForm({ ...createForm, externalPoolId: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Pool Name
              </label>
              <Input
                type="text"
                placeholder="e.g. Citizen Circle D"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Description
              </label>
              <Input
                type="text"
                placeholder="Circle description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing["3"] }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Mode
                </label>
                <Select
                  value={createForm.mode}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, mode: e.target.value as "BASIC" | "AUCTION" })
                  }
                  options={[
                    { label: "BASIC (Random Payout Slot)", value: "BASIC" },
                    { label: "AUCTION (Discount Bidding)", value: "AUCTION" },
                  ]}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Minimum Tier
                </label>
                <Select
                  value={String(createForm.minimumTier)}
                  onChange={(e) => setCreateForm({ ...createForm, minimumTier: Number(e.target.value) })}
                  options={[
                    { label: "Tier 1 - Explorer (0+)", value: "1" },
                    { label: "Tier 2 - Citizen (200+)", value: "2" },
                    { label: "Tier 3 - Builder (500+)", value: "3" },
                    { label: "Tier 4 - Trusted (800+)", value: "4" },
                    { label: "Tier 5 - Prime (950+)", value: "5" },
                  ]}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing["3"] }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Group Size
                </label>
                <Input
                  type="number"
                  value={String(createForm.groupSize)}
                  onChange={(e) => setCreateForm({ ...createForm, groupSize: Number(e.target.value) })}
                  min={2}
                  max={12}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Contribution Amount (Wei)
                </label>
                <Input
                  type="text"
                  value={createForm.contributionAmountWei}
                  onChange={(e) => setCreateForm({ ...createForm, contributionAmountWei: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {createForm.mode === "AUCTION" && (
              <div
                style={{
                  backgroundColor: "rgba(56, 189, 248, 0.08)",
                  padding: spacing["3"],
                  borderRadius: radius.md,
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: spacing["2"],
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#38bdf8" }}>
                  Auction Configuration
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing["2"] }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: color.text.muted, marginBottom: "2px" }}>
                      Open Day
                    </label>
                    <Input
                      type="number"
                      value={String(createForm.auctionOpenDay)}
                      onChange={(e) => setCreateForm({ ...createForm, auctionOpenDay: Number(e.target.value) })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: color.text.muted, marginBottom: "2px" }}>
                      Close Day
                    </label>
                    <Input
                      type="number"
                      value={String(createForm.auctionCloseDay)}
                      onChange={(e) => setCreateForm({ ...createForm, auctionCloseDay: Number(e.target.value) })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: color.text.muted, marginBottom: "2px" }}>
                      Max Discount (Bps)
                    </label>
                    <Input
                      type="number"
                      value={String(createForm.maxDiscountBps)}
                      onChange={(e) => setCreateForm({ ...createForm, maxDiscountBps: Number(e.target.value) })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}

            {formError && (
              <div style={{ color: color.status.error, fontSize: "13px" }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: spacing["2"] }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Pool"}
              </Button>
            </div>
          </form>
        </Modal>
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
