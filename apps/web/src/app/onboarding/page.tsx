"use client";

import React from "react";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { OnboardingForm } from "../../components/profile/OnboardingForm";

function OnboardingPageContent() {
  return (
    <Shell activeHref="/onboarding">
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 8px 0" }}>
          Member Onboarding
        </h1>
        <p style={{ color: "#C2C6D6", margin: 0, fontSize: "14px" }}>
          Lengkapi identitas profil dan verifikasi email Anda untuk membuka hak partisipasi pool ROSCA.
        </p>
      </div>

      <OnboardingForm
        onComplete={() => {
          window.location.href = "/dashboard";
        }}
      />
    </Shell>
  );
}

export default function OnboardingPage() {
  return (
    <AppProviders>
      <OnboardingPageContent />
    </AppProviders>
  );
}
