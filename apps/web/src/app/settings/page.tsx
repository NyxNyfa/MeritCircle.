"use client";

import React from "react";
import { color, spacing, Button, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingForm } from "../../components/profile/OnboardingForm";

function SettingsContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (!isAuthenticated && !authLoading) {
    return (
      <Shell activeHref="/settings">
        <EmptyState
          title="Wallet Not Connected"
          description="Silakan hubungkan dompet Web3 Anda untuk mengakses pengaturan profil akun."
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
    <Shell activeHref="/settings">
      <div style={{ marginBottom: spacing["6"] }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, marginBottom: "8px" }}>
          Profile & Account Settings
        </h1>
        <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
          Perbarui data profil, ubah alamat email, dan hubungkan akun media sosial Anda.
        </p>
      </div>

      <OnboardingForm />
    </Shell>
  );
}

export default function SettingsPage() {
  return (
    <AppProviders>
      <SettingsContent />
    </AppProviders>
  );
}
