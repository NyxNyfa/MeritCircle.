"use client";

import React, { useEffect, useState } from "react";
import { color, radius, spacing, Card, Button, LoadingState, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { useAuth } from "../../hooks/useAuth";
import { getMyContributions } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import { PaymentCard, ContributionItem } from "../../components/payment/PaymentCard";

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

  const pendingContributions = contributions.filter(
    (c) => c.status === "PENDING"
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
          {/* Pending Dues */}
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: spacing["4"] }}>
              Tagihan Aktif Wajib Disetor ({pendingContributions.length})
            </h2>

            {pendingContributions.length === 0 ? (
              <Card
                style={{
                  backgroundColor: color.background.card,
                  border: `1px solid ${color.border.subtle}`,
                  padding: spacing["8"],
                  textAlign: "center",
                  color: color.text.muted,
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎉</div>
                <div style={{ fontWeight: 600, color: color.status.success, marginBottom: "4px" }}>
                  Semua Iuran Lunas!
                </div>
                Tidak ada tagihan tertunggak pada siklus berjalan saat ini.
              </Card>
            ) : (
              pendingContributions.map((contrib) => (
                <PaymentCard
                  key={contrib.id}
                  contribution={contrib}
                  onPaymentSuccess={fetchContributions}
                />
              ))
            )}
          </div>

          {/* Completed History */}
          {completedContributions.length > 0 && (
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: spacing["4"] }}>
                Riwayat Setoran Selesai ({completedContributions.length})
              </h2>

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
