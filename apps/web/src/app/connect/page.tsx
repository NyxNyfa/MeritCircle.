"use client";

import React, { useState } from "react";
import { color, radius, spacing, Button, Card } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { useWallet } from "../../hooks/useWallet";
import { useAuth } from "../../hooks/useAuth";
import { formatAddress } from "../../lib/format";
import { LockIcon, AlertTriangleIcon, CheckIcon } from "../../components/layout/Icons";

function ConnectPageContent() {
  const { address, isConnected, isCorrectNetwork, switchNetwork } = useWallet();
  const { loginWithWallet, isLoading, user, isAuthenticated, error } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const handleConnectAndLogin = async () => {
    const success = await loginWithWallet();
    if (success) {
      setRedirecting(true);
      if (!user?.username || !user?.isEmailVerified) {
        window.location.href = "/onboarding";
      } else {
        window.location.href = "/dashboard";
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: color.background.app,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing["6"],
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: color.background.card,
          border: `1px solid ${color.border.medium}`,
          borderRadius: radius.xl,
          padding: spacing["8"],
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: radius.lg,
            background: `linear-gradient(135deg, ${color.brand.primary}, ${color.brand.accentCyan})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: `0 auto ${spacing["4"]}`,
            color: "#FFFFFF",
          }}
        >
          <LockIcon size={26} />
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, marginBottom: "8px", color: color.text.primary }}>
          Connect to Merit Circle
        </h1>

        <p style={{ fontSize: "14px", color: color.text.secondary, margin: `0 0 ${spacing["6"]}` }}>
          Connect your Web3 wallet and authorize login via cryptographic signature to enter your
          ROSCA dashboard.
        </p>

        {isConnected && !isCorrectNetwork && (
          <div
            style={{
              padding: spacing["4"],
              marginBottom: spacing["4"],
              borderRadius: radius.md,
              backgroundColor: color.status.warningBackground,
              border: `1px solid ${color.status.warning}`,
              fontSize: "13px",
              color: color.status.warning,
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertTriangleIcon size={16} />
              <span>Jaringan Tidak Cocok</span>
            </div>
            Dompet Anda terhubung ke jaringan lain. Silakan beralih ke BNB Smart Chain Testnet (Chain ID 97).
            <div style={{ marginTop: "10px" }}>
              <Button size="sm" variant="outline" onClick={switchNetwork}>
                Switch Network to BNB Testnet
              </Button>
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
              color: color.status.error,
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {isAuthenticated && user ? (
          <div>
            <div
              style={{
                padding: spacing["4"],
                backgroundColor: color.background.surface,
                borderRadius: radius.md,
                border: `1px solid ${color.border.subtle}`,
                marginBottom: spacing["4"],
                fontSize: "14px",
              }}
            >
              <div style={{ color: color.status.success, fontWeight: 600, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckIcon size={16} />
                <span>Connected & Authenticated</span>
              </div>
              <div style={{ color: color.text.secondary }}>
                {formatAddress(user.walletAddress)} ({user.username || "Profile Incomplete"})
              </div>
            </div>

            <Button
              variant="liquid-metal"
              size="lg"
              onClick={() => {
                window.location.href = user.username && user.isEmailVerified ? "/dashboard" : "/onboarding";
              }}
              style={{ width: "100%" }}
            >
              Continue to {user.username && user.isEmailVerified ? "Dashboard" : "Onboarding"} →
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: spacing["3"] }}>
            <Button
              variant="liquid-metal"
              size="lg"
              loading={isLoading || redirecting}
              onClick={handleConnectAndLogin}
            >
              Connect & Sign Nonce
            </Button>
            <a
              href="/"
              style={{
                fontSize: "13px",
                color: color.text.muted,
                textDecoration: "none",
                marginTop: spacing["2"],
              }}
            >
              ← Back to Home
            </a>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <AppProviders>
      <ConnectPageContent />
    </AppProviders>
  );
}
