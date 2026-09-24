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
import { getAdminPools, createAdminPool, patchAdminPool, updateAdminPool, deleteAdminPool } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error";
import { RefreshIcon } from "../../../components/layout/Icons";

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

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editingPool, setEditingPool] = useState<PoolItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    minimumTier: 2,
    groupSize: 3,
    cycleDurationDays: 30,
    paymentWindowDays: 10,
    auctionOpenDay: 11,
    auctionCloseDay: 20,
    settlementDay: 30,
    contributionAmountWei: "1000000000000000",
    maxDiscountBps: 1000,
    status: "ACTIVE" as "ACTIVE" | "PAUSED" | "CLOSED",
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const handleOpenEdit = (pool: PoolItem) => {
    setEditingPool(pool);
    setEditForm({
      name: pool.name,
      description: pool.description || "",
      minimumTier: pool.minimumTier,
      groupSize: pool.groupSize,
      cycleDurationDays: pool.cycleDurationDays,
      paymentWindowDays: pool.paymentWindowDays,
      auctionOpenDay: pool.auctionOpenDay || 11,
      auctionCloseDay: pool.auctionCloseDay || 20,
      settlementDay: pool.settlementDay,
      contributionAmountWei: pool.contributionAmountWei,
      maxDiscountBps: pool.maxDiscountBps || 1000,
      status: pool.status,
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPool) return;
    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const payload: any = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        minimumTier: Number(editForm.minimumTier),
        groupSize: Number(editForm.groupSize),
        cycleDurationDays: Number(editForm.cycleDurationDays),
        paymentWindowDays: Number(editForm.paymentWindowDays),
        settlementDay: Number(editForm.settlementDay),
        contributionAmountWei: editForm.contributionAmountWei.trim(),
        status: editForm.status,
      };

      if (editingPool.mode === "AUCTION") {
        payload.auctionOpenDay = Number(editForm.auctionOpenDay);
        payload.auctionCloseDay = Number(editForm.auctionCloseDay);
        payload.maxDiscountBps = Number(editForm.maxDiscountBps);
      }

      await updateAdminPool(editingPool.id, payload);
      await fetchPools();
      setIsEditOpen(false);
    } catch (err: any) {
      setEditError(getErrorMessage(err));
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeletePool = async (pool: PoolItem) => {
    if (
      !confirm(
        `Konfirmasi Penghapusan: Apakah Anda yakin ingin menghapus pool "${pool.name}" (${pool.externalPoolId})? Tindakan ini permanen.`
      )
    ) {
      return;
    }
    try {
      const res = await deleteAdminPool(pool.id);
      alert(res.message || "Pool berhasil dihapus.");
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
          <Button variant="secondary" onClick={fetchPools} disabled={isLoading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RefreshIcon size={14} />
            <span>Refresh</span>
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
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenEdit(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={p.status === "ACTIVE" ? "secondary" : "primary"}
                          onClick={() => handleToggleStatus(p)}
                        >
                          {p.status === "ACTIVE" ? "Pause" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeletePool(p)}
                        >
                          Delete
                        </Button>
                      </div>
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

      {/* Edit Pool Modal */}
      {isEditOpen && editingPool && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => !isEditSubmitting && setIsEditOpen(false)}
          title={`Edit Pool: ${editingPool.name} (${editingPool.externalPoolId})`}
        >
          <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: spacing["3"] }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Pool Name
              </label>
              <Input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                disabled={isEditSubmitting}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Description
              </label>
              <Input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                disabled={isEditSubmitting}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing["3"] }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Status
                </label>
                <Select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value as "ACTIVE" | "PAUSED" | "CLOSED" })
                  }
                  options={[
                    { label: "ACTIVE", value: "ACTIVE" },
                    { label: "PAUSED", value: "PAUSED" },
                    { label: "CLOSED", value: "CLOSED" },
                  ]}
                  disabled={isEditSubmitting}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Minimum Tier
                </label>
                <Select
                  value={String(editForm.minimumTier)}
                  onChange={(e) => setEditForm({ ...editForm, minimumTier: Number(e.target.value) })}
                  options={[
                    { label: "Tier 1 - Explorer (0+)", value: "1" },
                    { label: "Tier 2 - Citizen (200+)", value: "2" },
                    { label: "Tier 3 - Builder (500+)", value: "3" },
                    { label: "Tier 4 - Trusted (800+)", value: "4" },
                    { label: "Tier 5 - Prime (950+)", value: "5" },
                  ]}
                  disabled={isEditSubmitting}
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
                  value={String(editForm.groupSize)}
                  onChange={(e) => setEditForm({ ...editForm, groupSize: Number(e.target.value) })}
                  min={2}
                  max={12}
                  required
                  disabled={isEditSubmitting}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Contribution Amount (Wei)
                </label>
                <Input
                  type="text"
                  value={editForm.contributionAmountWei}
                  onChange={(e) => setEditForm({ ...editForm, contributionAmountWei: e.target.value })}
                  required
                  disabled={isEditSubmitting}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing["3"] }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: color.text.muted, marginBottom: "2px" }}>
                  Cycle Duration (Days)
                </label>
                <Input
                  type="number"
                  value={String(editForm.cycleDurationDays)}
                  onChange={(e) => setEditForm({ ...editForm, cycleDurationDays: Number(e.target.value) })}
                  required
                  disabled={isEditSubmitting}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: color.text.muted, marginBottom: "2px" }}>
                  Payment Window (Days)
                </label>
                <Input
                  type="number"
                  value={String(editForm.paymentWindowDays)}
                  onChange={(e) => setEditForm({ ...editForm, paymentWindowDays: Number(e.target.value) })}
                  required
                  disabled={isEditSubmitting}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: color.text.muted, marginBottom: "2px" }}>
                  Settlement Day
                </label>
                <Input
                  type="number"
                  value={String(editForm.settlementDay)}
                  onChange={(e) => setEditForm({ ...editForm, settlementDay: Number(e.target.value) })}
                  required
                  disabled={isEditSubmitting}
                />
              </div>
            </div>

            {editingPool.mode === "AUCTION" && (
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
                      value={String(editForm.auctionOpenDay)}
                      onChange={(e) => setEditForm({ ...editForm, auctionOpenDay: Number(e.target.value) })}
                      disabled={isEditSubmitting}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: color.text.muted, marginBottom: "2px" }}>
                      Close Day
                    </label>
                    <Input
                      type="number"
                      value={String(editForm.auctionCloseDay)}
                      onChange={(e) => setEditForm({ ...editForm, auctionCloseDay: Number(e.target.value) })}
                      disabled={isEditSubmitting}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: color.text.muted, marginBottom: "2px" }}>
                      Max Discount (Bps)
                    </label>
                    <Input
                      type="number"
                      value={String(editForm.maxDiscountBps)}
                      onChange={(e) => setEditForm({ ...editForm, maxDiscountBps: Number(e.target.value) })}
                      disabled={isEditSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}

            {editError && (
              <div style={{ color: color.status.error, fontSize: "13px" }}>
                {editError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: spacing["2"] }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditOpen(false)}
                disabled={isEditSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isEditSubmitting}>
                {isEditSubmitting ? "Saving..." : "Save Changes"}
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
