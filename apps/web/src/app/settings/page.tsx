"use client";

import React, { useState } from "react";
import { color, radius, spacing, Button, Card, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { useAuth } from "../../hooks/useAuth";
import { useReputation } from "../../hooks/useReputation";
import { OnboardingForm } from "../../components/profile/OnboardingForm";
import { formatAddress, formatPoint, formatTier } from "../../lib/format";
import {
  UserIcon,
  ShieldIcon,
  CheckIcon,
  AlertTriangleIcon,
  CopyIcon,
  EditIcon,
  ExternalLinkIcon,
  MailIcon,
  StarIcon,
} from "../../components/layout/Icons";

function SettingsContent() {
  const { user, isAuthenticated, isLoading: authLoading, refreshProfile } = useAuth();
  const { points: repPoints, tier: repTier, refresh: refreshReputation } = useReputation();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayPoints =
    !isAuthenticated || !user
      ? 0
      : (user.reputationPoints ?? repPoints ?? 0);
  const displayTier =
    !isAuthenticated || !user
      ? 1
      : (user.tier ?? repTier ?? 1);

  React.useEffect(() => {
    setIsEditing(false);
    if (isAuthenticated) {
      refreshProfile();
      refreshReputation();
    }
  }, [isAuthenticated, user?.id, user?.walletAddress, refreshProfile, refreshReputation]);

  const handleCopyAddress = () => {
    if (!user?.walletAddress) return;
    navigator.clipboard.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <Shell activeHref="/settings">
        <EmptyState
          title="Wallet Not Connected"
          description="Silakan hubungkan dompet Web3 Anda untuk mengakses data profil akun."
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

  return (
    <Shell activeHref="/settings">
      {/* Header section with Edit toggle button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing["6"],
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, marginBottom: "8px" }}>
            {isEditing ? "Edit Profile" : "Account Profile"}
          </h1>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            {isEditing
              ? "Perbarui informasi profil, unggah avatar PNG, dan verifikasi email Anda."
              : "Ringkasan identitas akun, status verifikasi, dan reputasi on-chain Merit Circle Anda."}
          </p>
        </div>

        {!isEditing ? (
          <Button
            variant="liquid-metal"
            size="md"
            onClick={() => setIsEditing(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <EditIcon size={16} />
            Edit Profile
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsEditing(false)}
          >
            Back to Profile
          </Button>
        )}
      </div>

      {isEditing ? (
        /* Edit Mode: OnboardingForm */
        <OnboardingForm
          onCancel={() => setIsEditing(false)}
          onComplete={() => {
            setIsEditing(false);
            refreshProfile();
            refreshReputation();
          }}
        />
      ) : (
        /* View Mode: Comprehensive, Elegant Profile Overview */
        <div style={{ display: "flex", flexDirection: "column", gap: spacing["6"] }}>
          {/* Main User Card */}
          <Card
            className="mc-glass"
            style={{
              padding: spacing["6"],
              backgroundColor: "rgba(23, 27, 38, 0.8)",
              border: `1px solid ${color.border.subtle}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing["6"],
                flexWrap: "wrap",
              }}
            >
              {/* Avatar circle */}
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(77, 142, 255, 0.1)",
                  border: `2px solid ${color.brand.primary}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                  boxShadow: "0 0 20px rgba(77, 142, 255, 0.2)",
                }}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <UserIcon size={36} style={{ color: color.brand.primaryLight }} />
                )}
              </div>

              {/* User Identity Details */}
              <div style={{ flex: 1, minWidth: "240px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: color.text.primary }}>
                    {user?.username ? `@${user.username}` : "Belum Mengatur Username"}
                  </h2>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: radius.full,
                      backgroundColor: user?.username ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                      color: user?.username ? color.status.success : color.status.warning,
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {user?.username ? "Registered" : "Username Required"}
                  </span>
                </div>

                {/* Wallet Address with Copy */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: color.text.muted, fontSize: "13px" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {user?.walletAddress || "-"}
                  </span>
                  {user?.walletAddress && (
                    <>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        style={{
                          background: "none",
                          border: "none",
                          color: copied ? color.status.success : color.text.muted,
                          cursor: "pointer",
                          padding: "2px",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        title="Copy full address"
                      >
                        <CopyIcon size={14} />
                      </button>
                      <a
                        href={`https://testnet.bscscan.com/address/${user.walletAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: color.brand.accentElectric,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        title="View on BSCScan"
                      >
                        <ExternalLinkIcon size={14} />
                      </a>
                      {copied && (
                        <span style={{ fontSize: "11px", color: color.status.success, fontWeight: 600 }}>
                          Copied!
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Reputation & Tier Block */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "4px",
                  padding: "12px 20px",
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderRadius: radius.lg,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ fontSize: "12px", color: color.text.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Reputation Status
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <StarIcon size={18} style={{ color: color.brand.accentElectric }} />
                  <span style={{ fontSize: "22px", fontWeight: 800, color: color.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatPoint(displayPoints)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: color.brand.accentCyan,
                  }}
                >
                  {formatTier(displayTier)}
                </div>
              </div>
            </div>
          </Card>

          {/* Details Grid: Email & Gate Status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: spacing["6"] }}>
            {/* Email Status Card */}
            <Card
              className="mc-glass"
              style={{
                padding: spacing["6"],
                backgroundColor: "rgba(23, 27, 38, 0.8)",
                border: `1px solid ${color.border.subtle}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: spacing["4"] }}>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: radius.md,
                    backgroundColor: "rgba(77, 142, 255, 0.1)",
                    color: color.brand.primaryLight,
                    display: "flex",
                  }}
                >
                  <MailIcon size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: color.text.primary }}>
                    Email Verification
                  </h3>
                  <div style={{ fontSize: "12px", color: color.text.muted }}>
                    Kredensial notifikasi siklus dan pengamanan akun
                  </div>
                </div>
              </div>

              <div style={{ padding: spacing["4"], backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: radius.md, marginBottom: spacing["4"] }}>
                <div style={{ fontSize: "12px", color: color.text.muted, marginBottom: "4px" }}>
                  Registered Email
                </div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: color.text.primary, wordBreak: "break-all" }}>
                  {user?.email || "Belum ada alamat email terdaftar"}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px",
                    borderRadius: radius.full,
                    backgroundColor: user?.isEmailVerified ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                    color: user?.isEmailVerified ? color.status.success : color.status.warning,
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {user?.isEmailVerified ? (
                    <>
                      <CheckIcon size={14} />
                      Verified (+40 Reputation)
                    </>
                  ) : (
                    <>
                      <AlertTriangleIcon size={14} />
                      Unverified
                    </>
                  )}
                </div>

                {!user?.isEmailVerified && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Verifikasi Sekarang
                  </Button>
                )}
              </div>
            </Card>

            {/* ROSCA Participation Gate Card */}
            <Card
              className="mc-glass"
              style={{
                padding: spacing["6"],
                backgroundColor: "rgba(23, 27, 38, 0.8)",
                border: `1px solid ${color.border.subtle}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: spacing["4"] }}>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: radius.md,
                    backgroundColor: "rgba(56, 217, 169, 0.1)",
                    color: color.status.success,
                    display: "flex",
                  }}
                >
                  <ShieldIcon size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: color.text.primary }}>
                    Participation Gate
                  </h3>
                  <div style={{ fontSize: "12px", color: color.text.muted }}>
                    Persyaratan wajib untuk bergabung ke dalam kelompok arisan
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: color.text.secondary }}>1. Wallet Connected</span>
                  <span style={{ color: color.status.success, display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                    <CheckIcon size={14} /> Ready
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: color.text.secondary }}>2. Username Registered</span>
                  {user?.username ? (
                    <span style={{ color: color.status.success, display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <CheckIcon size={14} /> @{user.username}
                    </span>
                  ) : (
                    <span style={{ color: color.status.warning, display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <AlertTriangleIcon size={14} /> Required
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: color.text.secondary }}>3. Email Verified</span>
                  {user?.isEmailVerified ? (
                    <span style={{ color: color.status.success, display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <CheckIcon size={14} /> Verified (+40)
                    </span>
                  ) : (
                    <span style={{ color: color.status.warning, display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <AlertTriangleIcon size={14} /> Required
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: color.text.secondary }}>4. Minimum Tier</span>
                  <span style={{ color: color.status.success, display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                    <CheckIcon size={14} /> Tier {displayTier}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Social Links Card */}
          <Card
            className="mc-glass"
            style={{
              padding: spacing["6"],
              backgroundColor: "rgba(23, 27, 38, 0.8)",
              border: `1px solid ${color.border.subtle}`,
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, marginBottom: spacing["4"], color: color.text.primary }}>
              Linked Social Profiles
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: spacing["4"] }}>
              <div style={{ padding: spacing["4"], backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: radius.md }}>
                <div style={{ fontSize: "12px", color: color.text.muted, marginBottom: "4px" }}>X (Twitter)</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: user?.xUrl ? color.text.primary : color.text.muted, wordBreak: "break-all" }}>
                  {user?.xUrl || "Not linked"}
                </div>
              </div>

              <div style={{ padding: spacing["4"], backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: radius.md }}>
                <div style={{ fontSize: "12px", color: color.text.muted, marginBottom: "4px" }}>Telegram</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: user?.telegramUrl ? color.text.primary : color.text.muted, wordBreak: "break-all" }}>
                  {user?.telegramUrl || "Not linked"}
                </div>
              </div>

              <div style={{ padding: spacing["4"], backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: radius.md }}>
                <div style={{ fontSize: "12px", color: color.text.muted, marginBottom: "4px" }}>Discord</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: user?.discordHandle ? color.text.primary : color.text.muted, wordBreak: "break-all" }}>
                  {user?.discordHandle || "Not linked"}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
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
