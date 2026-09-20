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
  Input,
  Select,
} from "@merit-circle/ui";
import { AppProviders } from "../../../providers/AppProviders";
import { AdminShell } from "../../../components/layout/AdminShell";
import { getAdminUsers, adjustUserReputation } from "../../../lib/api";

function AdminReputationContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick adjustment form state
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [pointsInput, setPointsInput] = useState<string>("100");
  const [reasonInput, setReasonInput] = useState<string>("Admin reputation adjustment");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchReputationData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers();
      const allUsers = res.users || [];
      // Sort users by reputation descending
      allUsers.sort((a: any, b: any) => b.reputationPoint - a.reputationPoint);
      setUsers(allUsers);
      if (allUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(allUsers[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load reputation registry");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReputationData();
  }, []);

  // Compute tier distribution
  const tierCounts = [0, 0, 0, 0, 0, 0]; // index 1..5
  for (const u of users) {
    const t = Math.min(Math.max(u.tier || 1, 1), 5);
    tierCounts[t] = (tierCounts[t] || 0) + 1;
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    const pointsNum = parseInt(pointsInput, 10);
    if (isNaN(pointsNum) || pointsNum === 0) {
      setAdjustError("Please specify a valid non-zero points adjustment");
      return;
    }

    if (!reasonInput.trim()) {
      setAdjustError("Adjustment reason is required");
      return;
    }

    setIsSubmitting(true);
    setAdjustError(null);
    setAdjustSuccess(null);
    try {
      const res = await adjustUserReputation(selectedUserId, pointsNum, reasonInput.trim());
      setAdjustSuccess(
        `✓ Adjusted user reputation! New Points: ${res.reputationPoints}, Tier: ${res.tier}`
      );
      await fetchReputationData();
    } catch (err: any) {
      setAdjustError(err?.message || "Failed to adjust reputation points");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell activeHref="/admin/reputation">
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
            Reputation Engine & Tier Distribution
          </h1>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            Audit participant reputation points (0–1000 scale), review tier cohorts, and execute authorized adjustments.
          </p>
        </div>

        <Button variant="secondary" onClick={fetchReputationData} disabled={isLoading}>
          🔄 Refresh
        </Button>
      </div>

      {isLoading && <LoadingState message="Calculating tier distributions..." />}

      {error && (
        <ErrorState
          title="Reputation Registry Error"
          message={error}
          onRetry={fetchReputationData}
        />
      )}

      {!isLoading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing["6"] }}>
          {/* Tier Distribution Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: spacing["4"],
            }}
          >
            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, fontWeight: 600 }}>
                TIER 1 (EXPLORER)
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#FFFFFF", marginTop: "4px" }}>
                {tierCounts[1]} users
              </div>
              <div style={{ fontSize: "11px", color: color.text.secondary, marginTop: "4px" }}>
                0 – 199 pts • Starter pool eligible
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, fontWeight: 600 }}>
                TIER 2 (CITIZEN)
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: color.brand.primary, marginTop: "4px" }}>
                {tierCounts[2]} users
              </div>
              <div style={{ fontSize: "11px", color: color.text.secondary, marginTop: "4px" }}>
                200 – 499 pts • Citizen pools eligible
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, fontWeight: 600 }}>
                TIER 3 (BUILDER)
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#38bdf8", marginTop: "4px" }}>
                {tierCounts[3]} users
              </div>
              <div style={{ fontSize: "11px", color: color.text.secondary, marginTop: "4px" }}>
                500 – 799 pts • Builder pools eligible
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, fontWeight: 600 }}>
                TIER 4 (TRUSTED)
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#a855f7", marginTop: "4px" }}>
                {tierCounts[4]} users
              </div>
              <div style={{ fontSize: "11px", color: color.text.secondary, marginTop: "4px" }}>
                800 – 949 pts • Auction pools eligible
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: "12px", color: color.text.muted, fontWeight: 600 }}>
                TIER 5 (PRIME)
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#eab308", marginTop: "4px" }}>
                {tierCounts[5]} users
              </div>
              <div style={{ fontSize: "11px", color: color.text.secondary, marginTop: "4px" }}>
                950 – 1000 pts • Maximum trust status
              </div>
            </Card>
          </div>

          {/* Quick Adjustment & Leaderboard Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing["6"] }}>
            {/* Adjustment Form */}
            <Card>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: spacing["2"] }}>
                Admin Reputation Adjustment Form
              </h2>
              <p style={{ color: color.text.muted, fontSize: "13px", margin: 0, marginBottom: spacing["4"] }}>
                All adjustments are clamped 0–1000 and immutably recorded in the system audit log.
              </p>

              <form onSubmit={handleAdjustSubmit} style={{ display: "flex", flexDirection: "column", gap: spacing["3"] }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Select Target User
                  </label>
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    options={users.map((u) => ({
                      label: `${u.username || "Anonymous"} (${u.reputationPoint} pts, Tier ${u.tier})`,
                      value: u.id,
                    }))}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Points Delta (+ or -)
                  </label>
                  <Input
                    type="number"
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    placeholder="e.g. 100"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Reason / Justification
                  </label>
                  <Input
                    type="text"
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="e.g. Demonstration bonus"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {adjustError && (
                  <div style={{ color: color.status.error, fontSize: "13px" }}>
                    {adjustError}
                  </div>
                )}

                {adjustSuccess && (
                  <div style={{ color: color.status.success, fontSize: "13px", fontWeight: 600 }}>
                    {adjustSuccess}
                  </div>
                )}

                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Apply Adjustment"}
                </Button>
              </form>
            </Card>

            {/* Users Sorted By Reputation */}
            <Card>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: spacing["3"] }}>
                Reputation Leaderboard
              </h2>
              <div style={{ overflowX: "auto", maxHeight: "420px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                      <th style={{ padding: "8px 10px" }}>RANK</th>
                      <th style={{ padding: "8px 10px" }}>USER</th>
                      <th style={{ padding: "8px 10px" }}>TIER</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>POINTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${color.border.subtle}` }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: color.text.muted }}>
                          #{idx + 1}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ fontWeight: 600, color: "#FFFFFF" }}>
                            {u.username || "Anonymous"}
                          </div>
                          <div style={{ fontSize: "11px", color: color.text.muted, fontFamily: "monospace" }}>
                            {u.walletAddress?.slice(0, 10)}...
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <Badge variant="info">Tier {u.tier}</Badge>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: color.brand.primary }}>
                          {u.reputationPoint} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminReputationPage() {
  return (
    <AppProviders>
      <AdminReputationContent />
    </AppProviders>
  );
}
