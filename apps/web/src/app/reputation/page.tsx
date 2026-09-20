"use client";

import React from "react";
import { color, spacing, Button, LoadingState, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { useAuth } from "../../hooks/useAuth";
import { useReputation } from "../../hooks/useReputation";
import { ReputationOverview } from "../../components/reputation/ReputationOverview";
import { ReputationHistory } from "../../components/reputation/ReputationHistory";

function ReputationContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { points, tier, maxActiveGroups, history, isLoading } = useReputation();

  if (!isAuthenticated && !authLoading) {
    return (
      <Shell activeHref="/reputation">
        <EmptyState
          title="Wallet Not Connected"
          description="Silakan hubungkan dompet Web3 Anda untuk melihat skor reputasi dan buku besar riwayat poin."
          action={
            <Button
              variant="primary"
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

  return (
    <Shell activeHref="/reputation">
      <div style={{ marginBottom: spacing["6"] }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, marginBottom: "8px" }}>
          Reputation & Tier Center
        </h1>
        <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
          Skor reputasi (0–1000) menentukan tingkatan Tier Anda (Tier 1 s.d. 5) dan kapasitas
          maksimal keikutsertaan kelompok arisan secara bersamaan.
        </p>
      </div>

      {isLoading ? (
        <LoadingState message="Memuat data reputasi akun..." />
      ) : (
        <>
          <ReputationOverview
            points={points}
            tier={tier}
            maxActiveGroups={maxActiveGroups}
          />

          <ReputationHistory events={history} />
        </>
      )}
    </Shell>
  );
}

export default function ReputationPage() {
  return (
    <AppProviders>
      <ReputationContent />
    </AppProviders>
  );
}
