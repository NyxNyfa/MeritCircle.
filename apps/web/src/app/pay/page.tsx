"use client";

import React, { useEffect, useState } from "react";
import { color, radius, spacing, Card, Button, LoadingState, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { useAuth } from "../../hooks/useAuth";
import { getMyContributions } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import { PaymentCard, ContributionItem } from "../../components/payment/PaymentCard";
import { PartyPopperIcon } from "../../components/layout/Icons";

function PaymentHubContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContributions = () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getMyContributions()
      .then((res) => {
        setContributions(res.contributions || []);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchContributions();
  }, [isAuthenticated]);

  if (!isAuthenticated && !authLoading) {
    return (
      <Shell activeHref="/pay">
        <EmptyState
          title="Wallet Not Connected"
          description="Silakan hubungkan dompet Web3 Anda untuk melihat tagihan iuran siklus berjalan."
          action={
            <Button
              variant="liquid-metal"
              size="md"
              onClick={() => {
                window.location.href = "/connect";
              }}
            >
              Connect Wallet
            </Button>
          }
        />
      </Shell>
    );
  }

  // Group-level active cycle calculation: ensures lowest pending cycle is always payable
  const activeCycleByGroup = React.useMemo(() => {
    const map = new Map<string, number>();

    // 1. Explicit signals from backend
    contributions.forEach((c) => {
      const gid = c.groupId || "default";
      if (c.cycleStatus === "PAYMENT_OPEN" || c.isPayable) {
        map.set(gid, Math.max(map.get(gid) || 1, c.cycleNumber));
      } else if (c.groupCurrentCycle && c.groupCurrentCycle > 1) {
        map.set(gid, Math.max(map.get(gid) || 1, c.groupCurrentCycle));
      }
    });

    // 2. Fallback: for any group with pending dues, the lowest pending cycle is the active payable cycle
    const groupIds = Array.from(new Set(contributions.map((c) => c.groupId || "default")));
    groupIds.forEach((gid) => {
      const pendingForGroup = contributions.filter(
        (x) => (x.groupId || "default") === gid && x.status === "PENDING"
      );
      if (pendingForGroup.length > 0) {
        const lowestPending = Math.min(...pendingForGroup.map((x) => x.cycleNumber));
        map.set(gid, Math.max(map.get(gid) || 1, lowestPending));
      }
    });

    return map;
  }, [contributions]);

  const isPayableContribution = (c: ContributionItem) => {
    if (c.status !== "PENDING") return false;
    if (c.isPayable === true) return true;
    if (c.cycleStatus === "PAYMENT_OPEN") return true;
    const gid = c.groupId || "default";
    const groupActiveCycle = activeCycleByGroup.get(gid) || c.groupCurrentCycle || 1;
    return c.cycleNumber <= groupActiveCycle;
  };

  const activePayableContributions = contributions.filter(isPayableContribution);
  const upcomingContributions = contributions.filter(
    (c) => c.status === "PENDING" && !isPayableContribution(c)
  );
  const completedContributions = contributions.filter(
    (c) => c.status === "PAID_ON_TIME" || c.status === "PAID_LATE"
  );

  return (
    <Shell activeHref="/pay">
      <div style={{ marginBottom: spacing["6"] }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, marginBottom: "8px" }}>
          Payment Hub — Setor Iuran Siklus
        </h1>
        <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
          Setor iuran tepat waktu (hari 0–10) untuk menjaga skor reputasi dan membuka akses lelang siklus.
        </p>
      </div>

      {isLoading ? (
        <LoadingState message="Memuat daftar tagihan iuran..." />
      ) : error ? (
        <Card
          style={{
            backgroundColor: color.status.errorBackground,
            border: `1px solid ${color.status.error}`,
            color: color.status.error,
            padding: spacing["6"],
            textAlign: "center",
          }}
        >
          {error}
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing["8"] }}>
          {/* Active Payable Dues */}
          <div>
            <div style={{ marginBottom: spacing["4"] }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: "4px" }}>
                Tagihan Aktif Siap Disetor ({activePayableContributions.length})
              </h2>
              <div style={{ fontSize: "13px", color: color.text.secondary }}>
                Tagihan siklus berjalan yang aktif dan siap disetor langsung melalui dompet MetaMask (tBNB).
              </div>
            </div>

            {activePayableContributions.length === 0 ? (
              <Card
                style={{
                  backgroundColor: color.background.card,
                  border: `1px solid ${color.border.subtle}`,
                  padding: spacing["8"],
                  textAlign: "center",
                  color: color.text.muted,
                }}
              >
                <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center", color: color.status.success }}>
                  <PartyPopperIcon size={36} />
                </div>
                <div style={{ fontWeight: 600, color: color.status.success, marginBottom: "4px" }}>
                  Semua Iuran Siklus Berjalan Lunas!
                </div>
                Tidak ada tagihan tertunggak pada siklus berjalan saat ini.
              </Card>
            ) : (
              activePayableContributions.map((contrib) => (
                <PaymentCard
                  key={contrib.id}
                  contribution={contrib}
                  onPaymentSuccess={fetchContributions}
                />
              ))
            )}
          </div>

          {/* Upcoming Schedule (Locked until current cycle settles) */}
          {upcomingContributions.length > 0 && (
            <div>
              <div style={{ marginBottom: spacing["4"] }}>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: "4px" }}>
                  Jadwal Siklus Mendatang ({upcomingContributions.length})
                </h2>
                <div style={{ fontSize: "13px", color: color.text.secondary }}>
                  Iuran siklus berikutnya. Tombol pembayaran akan otomatis terbuka setelah siklus berjalan saat ini selesai dan diselesaikan (settle).
                </div>
              </div>

              {upcomingContributions.map((contrib) => (
                <PaymentCard
                  key={contrib.id}
                  contribution={contrib}
                  onPaymentSuccess={fetchContributions}
                />
              ))}
            </div>
          )}

          {/* Completed History */}
          {completedContributions.length > 0 && (
            <div>
              <div style={{ marginBottom: spacing["4"] }}>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: "4px" }}>
                  Riwayat Setoran Selesai ({completedContributions.length})
                </h2>
                <div style={{ fontSize: "13px", color: color.text.secondary }}>
                  Daftar transaksi setoran yang telah terverifikasi sukses on-chain di BNB Smart Chain Testnet.
                </div>
              </div>

              {completedContributions.map((contrib) => (
                <PaymentCard
                  key={contrib.id}
                  contribution={contrib}
                  onPaymentSuccess={fetchContributions}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

export default function PayPage() {
  return (
    <AppProviders>
      <PaymentHubContent />
    </AppProviders>
  );
}
