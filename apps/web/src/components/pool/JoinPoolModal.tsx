"use client";

import React, { useState } from "react";
import { color, radius, spacing, Button, Card } from "@merit-circle/ui";
import { PoolData } from "./PoolCard";
import { formatWeiToBnb } from "../../lib/format";
import { joinPool } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import { useAuth } from "../../hooks/useAuth";

export interface JoinPoolModalProps {
  pool: PoolData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const JoinPoolModal: React.FC<JoinPoolModalProps> = ({
  pool,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasUsername = Boolean(user?.username);
  const hasEmailVerified = Boolean(user?.isEmailVerified);
  const isProfileComplete = hasUsername && hasEmailVerified;

  if (!isOpen || !pool) return null;

  const handleConfirmJoin = async () => {
    setIsJoining(true);
    setError(null);
    try {
      await joinPool(pool.id);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: color.background.modalOverlay,
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: spacing["4"],
      }}
    >
      <Card
        liquid
        variant="liquid"
        glow
        style={{
          width: "100%",
          maxWidth: "480px",
          borderRadius: radius["2xl"],
          padding: spacing["6"],
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing["4"],
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: color.text.primary }}>
            Confirm Joining {pool.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: color.text.muted,
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "14px", color: color.text.secondary, marginBottom: spacing["4"] }}>
          You are entering a ROSCA group. You commit to depositing contribution every cycle on time
          until the pool completes all {pool.cycleCount} cycles.
        </p>

        <div
          style={{
            backgroundColor: "rgba(12, 15, 24, 0.6)",
            backdropFilter: "blur(12px)",
            padding: spacing["4"],
            borderRadius: radius.lg,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
            marginBottom: spacing["4"],
            fontSize: "13px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: color.text.muted }}>Required Contribution:</span>
            <span style={{ fontWeight: 700, color: color.brand.accentElectric }}>
              {formatWeiToBnb(pool.contributionAmountWei)} / cycle
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: color.text.muted }}>Pool Mode:</span>
            <span style={{ fontWeight: 600, color: color.text.primary }}>{pool.mode}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: color.text.muted }}>Group Size:</span>
            <span>{pool.groupSize} Members</span>
          </div>
        </div>

        {!isProfileComplete && (
          <div
            style={{
              padding: spacing["3"],
              marginBottom: spacing["4"],
              borderRadius: radius.md,
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              border: `1px solid ${color.status.warning}`,
              fontSize: "13px",
              color: color.status.warning,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>⚠️ Profile Requirements Needed to Join:</div>
            {!hasUsername && <div>• Set a username in your profile (+20 Reputation)</div>}
            {!hasEmailVerified && <div>• Verify your email address (+40 Reputation)</div>}
            <div style={{ marginTop: "8px" }}>
              <a href="/onboarding" style={{ color: color.brand.accentElectric, textDecoration: "underline", fontWeight: 600 }}>
                Go to Profile Onboarding →
              </a>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: spacing["3"],
              marginBottom: spacing["4"],
              borderRadius: radius.md,
              backgroundColor: color.status.errorBackground,
              border: `1px solid ${color.status.error}`,
              fontSize: "13px",
              color: color.status.error,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="ghost" size="md" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            variant="liquid-metal"
            size="md"
            loading={isJoining}
            disabled={!isProfileComplete || isJoining}
            onClick={handleConfirmJoin}
            style={{ flex: 1 }}
          >
            Confirm & Join
          </Button>
        </div>
      </Card>
    </div>
  );
};
