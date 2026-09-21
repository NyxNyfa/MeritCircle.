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
} from "@merit-circle/ui";
import { AppProviders } from "../../../providers/AppProviders";
import { AdminShell } from "../../../components/layout/AdminShell";
import { getAdminUsers, adjustUserReputation } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error";

interface UserItem {
  id: string;
  walletAddress: string;
  username: string | null;
  email: string | null;
  emailVerifiedAt: string | null;
  role: string;
  status: string;
  reputationPoint: number;
  tier: number;
  activeGroupsCount: number;
  createdAt: string;
}

function AdminUsersContent() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Adjustment Modal State
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [pointsInput, setPointsInput] = useState<string>("50");
  const [reasonInput, setReasonInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers();
      setUsers(res.users || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdjustModal = (u: UserItem) => {
    setSelectedUser(u);
    setPointsInput("50");
    setReasonInput("Admin demo adjustment");
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const pointsNum = parseInt(pointsInput, 10);
    if (isNaN(pointsNum) || pointsNum === 0) {
      setSubmitError("Please specify a valid non-zero points adjustment");
      return;
    }

    if (!reasonInput.trim()) {
      setSubmitError("Adjustment reason is required for audit logs");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await adjustUserReputation(selectedUser.id, pointsNum, reasonInput.trim());
      setSubmitSuccess(
        `Successfully adjusted reputation. New Points: ${res.reputationPoints}, Tier: ${res.tier}`
      );
      // Refresh user roster
      await fetchUsers();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell activeHref="/admin/users">
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
            User Management & Reputation Control
          </h1>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            Inspect wallet participants, verify tier credentials, and perform authorized reputation adjustments.
          </p>
        </div>

        <Button variant="secondary" onClick={fetchUsers} disabled={isLoading}>
          🔄 Refresh
        </Button>
      </div>

      {isLoading && <LoadingState message="Loading participant registry..." />}

      {error && (
        <ErrorState
          title="User Registry Error"
          message={error}
          onRetry={fetchUsers}
        />
      )}

      {!isLoading && !error && (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                  <th style={{ padding: "12px 10px" }}>USER / WALLET</th>
                  <th style={{ padding: "12px 10px" }}>EMAIL VERIFIED</th>
                  <th style={{ padding: "12px 10px" }}>ROLE</th>
                  <th style={{ padding: "12px 10px" }}>REPUTATION</th>
                  <th style={{ padding: "12px 10px" }}>TIER</th>
                  <th style={{ padding: "12px 10px" }}>STATUS</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: `1px solid ${color.border.subtle}`,
                      transition: "background-color 0.15s",
                    }}
                  >
                    <td style={{ padding: "12px 10px" }}>
                      <div style={{ fontWeight: 600, color: "#FFFFFF" }}>
                        {u.username || "Anonymous"}
                      </div>
                      <div style={{ fontSize: "11px", color: color.text.muted, fontFamily: "monospace" }}>
                        {u.walletAddress}
                      </div>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      {u.emailVerifiedAt ? (
                        <Badge variant="success">✓ Verified</Badge>
                      ) : (
                        <Badge variant="neutral">Unverified</Badge>
                      )}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <Badge variant={u.role === "ADMIN" ? "warning" : "neutral"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 10px", fontWeight: 700, color: color.brand.primary }}>
                      {u.reputationPoint} pts
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <Badge variant="info">Tier {u.tier}</Badge>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <Badge variant={u.status === "ACTIVE" ? "success" : "warning"}>
                        {u.status}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenAdjustModal(u)}
                      >
                        Adjust Rep
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reputation Adjustment Modal */}
      {isModalOpen && selectedUser && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !isSubmitting && setIsModalOpen(false)}
          title={`Adjust Reputation: ${selectedUser.username || selectedUser.walletAddress.slice(0, 8)}`}
        >
          <form onSubmit={handleAdjustSubmit} style={{ display: "flex", flexDirection: "column", gap: spacing["4"] }}>
            {/* Audit Warning Notice */}
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: radius.md,
                padding: spacing["3"],
                fontSize: "13px",
                color: "#fca5a5",
              }}
            >
              ⚠️ <strong>Warning:</strong> Admin adjustment will be recorded in audit log. Final reputation points are clamped between 0 and 1000, and user tier is recalculated automatically.
            </div>

            <div style={{ display: "flex", gap: spacing["4"] }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: color.text.muted, marginBottom: "4px" }}>
                  Current Points:
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {selectedUser.reputationPoint} (Tier {selectedUser.tier})
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Points Delta (can be positive or negative)
              </label>
              <Input
                type="number"
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value)}
                placeholder="e.g. 100 or -50"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Reason / Justification
              </label>
              <Input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g. Demo seed Tier 4 onboarding"
                disabled={isSubmitting}
                required
              />
            </div>

            {submitError && (
              <div style={{ color: color.status.error, fontSize: "13px" }}>
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div style={{ color: color.status.success, fontSize: "13px", fontWeight: 600 }}>
                {submitSuccess}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: spacing["2"] }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Adjusting..." : "Confirm Adjustment"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AdminShell>
  );
}

export default function AdminUsersPage() {
  return (
    <AppProviders>
      <AdminUsersContent />
    </AppProviders>
  );
}
