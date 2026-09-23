"use client";

import React, { useState } from "react";
import { color, radius, spacing, Button, Card } from "@merit-circle/ui";
import { PoolData } from "./PoolCard";
import { formatWeiToBnb } from "../../lib/format";
import { joinPool } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import { useAuth } from "../../hooks/useAuth";
import { XIcon, AlertTriangleIcon } from "../layout/Icons";

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

  const [joinResult, setJoinResult] = useState<{
    groupId: string;
    groupStatus: string;
    slot: number;
    groupSize: number;
    groupWillBecomeActive: boolean;
  } | null>(null);

  const hasUsername = Boolean(user?.username);
  const hasEmailVerified = Boolean(user?.isEmailVerified);
  const isProfileComplete = hasUsername && hasEmailVerified;

  if (!isOpen || !pool) return null;

  const handleConfirmJoin = async () => {
    setIsJoining(true);
    setError(null);
    try {
      // Pre-request notification permission if not yet decided
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          // ignore
        }
      }

      const res: any = await joinPool(pool.id);
      const isFullAndActive = res?.groupStatus === "ACTIVE" || res?.groupWillBecomeActive;

      // Trigger Web Push Notification if active
      if (isFullAndActive && typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("🎉 Arisan Dimulai! Grup Aktif", {
            body: `Grup arisan ${pool.name} telah penuh dan otomatis aktif! Siklus 1 dibuka untuk setoran iuran.`,
            icon: "/favicon.ico",
          });
        }
      }

      setJoinResult({
        groupId: res?.groupId || "",
        groupStatus: isFullAndActive ? "ACTIVE" : "FORMING",
        slot: res?.slot || 1,
        groupSize: res?.groupSize || pool.groupSize,
        groupWillBecomeActive: Boolean(isFullAndActive),
      });
      onSuccess?.();
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
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
            }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {joinResult ? (
          <div>
            {joinResult.groupStatus === "ACTIVE" ? (
              <div style={{ textAlign: "center", padding: `${spacing["4"]} 0` }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: color.status.success, margin: "0 0 8px 0" }}>
                  Grup Berhasil Terbentuk & Aktif!
                </h3>
                <p style={{ fontSize: "14px", color: color.text.secondary, margin: "0 0 16px 0", lineHeight: 1.5 }}>
                  Semua slot anggota ({joinResult.groupSize}/{joinResult.groupSize}) telah terisi penuh. Siklus 1 telah dibuka untuk disetor dengan tBNB via Smart Contract.
                </p>
                <div
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: radius.md,
                    padding: spacing["3"],
                    marginBottom: spacing["6"],
                    fontSize: "13px",
                    color: color.text.primary,
                  }}
                >
                  Slot Payout Anda: <strong>Slot #{joinResult.slot}</strong> • Iuran Siklus 1: <strong>{formatWeiToBnb(pool.contributionAmountWei)}</strong>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Button
                    variant="liquid-metal"
                    size="md"
                    onClick={() => {
                      window.location.href = "/pay";
                    }}
                    style={{ width: "100%" }}
                  >
                    Bayar Iuran Siklus 1 Sekarang (tBNB) →
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      window.location.href = "/dashboard";
                    }}
                    style={{ width: "100%" }}
                  >
                    Buka Dashboard Kelompok
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: `${spacing["4"]} 0` }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px 0" }}>
                  Grup Dalam Pembentukan
                </h3>
                <p style={{ fontSize: "14px", color: color.text.secondary, margin: "0 0 16px 0", lineHeight: 1.5 }}>
                  Anda terdaftar pada <strong>Slot #{joinResult.slot}</strong> dari {joinResult.groupSize} anggota. Grup akan otomatis aktif dan notifikasi dikirim saat kuota terpenuhi.
                </p>
                <Button
                  variant="liquid-metal"
                  size="md"
                  onClick={() => {
                    window.location.href = "/dashboard";
                  }}
                  style={{ width: "100%" }}
                >
                  Buka Dashboard
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
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
                <div style={{ fontWeight: 600, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangleIcon size={16} />
                  <span>Profile Requirements Needed to Join:</span>
                </div>
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
          </>
        )}
      </Card>
    </div>
  );
};
