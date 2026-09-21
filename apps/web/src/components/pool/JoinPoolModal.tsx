"use client";

import React, { useState } from "react";
import { color, radius, spacing, Button, Card } from "@merit-circle/ui";
import { PoolData } from "./PoolCard";
import { formatWeiToBnb } from "../../lib/format";
import { joinPool } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";

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
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: color.background.card,
          border: `1px solid ${color.border.medium}`,
          borderRadius: radius.xl,
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
            backgroundColor: color.background.surface,
            padding: spacing["4"],
            borderRadius: radius.md,
            border: `1px solid ${color.border.subtle}`,
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
            variant="primary"
            size="md"
            loading={isJoining}
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
