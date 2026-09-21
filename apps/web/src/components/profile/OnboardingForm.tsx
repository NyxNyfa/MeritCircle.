"use client";

import React, { useState, useRef } from "react";
import { color, radius, spacing, Button, Card, Input } from "@merit-circle/ui";
import { useAuth } from "../../hooks/useAuth";
import { updateProfile, requestEmailVerification, confirmEmailVerification } from "../../lib/api";
import { formatPoint, formatTier } from "../../lib/format";
import { getErrorMessage } from "../../lib/error";

export const OnboardingForm: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { user, refreshProfile } = useAuth();

  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [verificationCode, setVerificationCode] = useState("");
  const [xUrl, setXUrl] = useState(user?.xUrl || "");
  const [telegramUrl, setTelegramUrl] = useState(user?.telegramUrl || "");
  const [discordHandle, setDiscordHandle] = useState(user?.discordHandle || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");

  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(user?.isEmailVerified || false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (file: File) => {
    if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) {
      setMessage({ type: "error", text: "Please upload a valid PNG image file." });
      return;
    }
    if (file.size > 1024 * 1024) {
      setMessage({ type: "error", text: "PNG image size must be less than 1MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        setMessage(null);
      }
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "Failed to read image file." });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Reputation preview calculation
  // Wallet connected: +10, Username: +20, Verified Email: +40, Socials: +10 each, Avatar: +10
  let calculatedPreviewPoints = 10;
  if (username.trim()) calculatedPreviewPoints += 20;
  if (isEmailVerified) calculatedPreviewPoints += 40;
  if (xUrl.trim()) calculatedPreviewPoints += 10;
  if (telegramUrl.trim()) calculatedPreviewPoints += 10;
  if (discordHandle.trim()) calculatedPreviewPoints += 10;
  if (avatarUrl.trim()) calculatedPreviewPoints += 10;

  const handleSendVerificationCode = async () => {
    if (!email || !email.includes("@")) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    setIsVerifying(true);
    setMessage(null);
    try {
      await requestEmailVerification(email);
      setIsCodeSent(true);
      setMessage({
        type: "success",
        text: `Verification code sent to ${email}. Please check your inbox (or spam folder).`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: getErrorMessage(err) });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!verificationCode) {
      setMessage({ type: "error", text: "Please enter 6-digit verification code." });
      return;
    }
    setIsVerifying(true);
    setMessage(null);
    try {
      const res = await confirmEmailVerification(verificationCode);
      if (res.emailVerified) {
        setIsEmailVerified(true);
        setMessage({ type: "success", text: "Email verified successfully! (+40 Reputation)" });
        await refreshProfile();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: getErrorMessage(err) });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage({ type: "error", text: "Username is required to participate in pools." });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        username: username.trim(),
        email: email.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        xUrl: xUrl.trim() || undefined,
        telegramUrl: telegramUrl.trim() || undefined,
        discordHandle: discordHandle.trim() || undefined,
      });

      await refreshProfile();
      setMessage({ type: "success", text: "Profile updated successfully!" });
      onComplete?.();
    } catch (err: any) {
      setMessage({ type: "error", text: getErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: spacing["8"] }}>
      {/* Form Area */}
      <Card
        style={{
          backgroundColor: color.background.card,
          border: `1px solid ${color.border.subtle}`,
          padding: spacing["6"],
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: spacing["2"] }}>
          Complete Your Onboarding Profile
        </h2>
        <p style={{ fontSize: "14px", color: color.text.secondary, marginBottom: spacing["6"] }}>
          Set your username and verify your email to unlock pool participation and build your ROSCA
          reputation tier.
        </p>

        {message && (
          <div
            style={{
              padding: spacing["3"],
              marginBottom: spacing["4"],
              borderRadius: radius.md,
              backgroundColor:
                message.type === "success"
                  ? color.status.successBackground
                  : color.status.errorBackground,
              border: `1px solid ${
                message.type === "success" ? color.status.success : color.status.error
              }`,
              color: message.type === "success" ? color.status.success : color.status.error,
              fontSize: "13px",
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: spacing["4"] }}>
          {/* Username (Required) */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Username <span style={{ color: color.status.error }}>*</span>
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. SatoshiBuilder"
              required
            />
            <span style={{ fontSize: "12px", color: color.text.muted, marginTop: "4px", display: "block" }}>
              Required to join any pool (+20 reputation points)
            </span>
          </div>

          {/* Email & OTP Verification */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Email Address <span style={{ color: color.status.error }}>*</span>
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (isEmailVerified) setIsEmailVerified(false);
                }}
                placeholder="your.name@example.com"
                disabled={isEmailVerified}
              />
              {!isEmailVerified && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  loading={isVerifying}
                  onClick={handleSendVerificationCode}
                >
                  Send OTP
                </Button>
              )}
            </div>

            {isEmailVerified ? (
              <span style={{ fontSize: "12px", color: color.status.success, marginTop: "4px", display: "block" }}>
                ✓ Email verified (+40 reputation points)
              </span>
            ) : (
              isCodeSent && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="liquid-cyan"
                    size="md"
                    loading={isVerifying}
                    onClick={handleConfirmCode}
                  >
                    Verify
                  </Button>
                </div>
              )
            )}
          </div>

          {/* Profile Picture (Optional) */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Profile Picture (PNG only, Optional)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,.png"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {avatarUrl ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing["4"],
                  padding: spacing["3"],
                  borderRadius: radius.md,
                  border: `1px solid ${color.border.subtle}`,
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                }}
              >
                <img
                  src={avatarUrl}
                  alt="Profile Preview"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: `2px solid ${color.brand.primary}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: color.text.primary }}>
                    PNG Profile Picture Loaded
                  </div>
                  <div style={{ fontSize: "12px", color: color.status.success, marginTop: "2px" }}>
                    ✓ Ready to save (+10 reputation points)
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change PNG
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAvatarUrl("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${color.border.subtle}`,
                  borderRadius: radius.md,
                  padding: spacing["5"],
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "6px" }}>🖼️</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: color.text.primary }}>
                  Click to browse or drag & drop PNG profile picture
                </div>
                <div style={{ fontSize: "12px", color: color.text.muted, marginTop: "4px" }}>
                  Only PNG files supported, max 1MB (+10 reputation points)
                </div>
              </div>
            )}
          </div>

          {/* Social Media (Optional) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing["4"] }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                X (Twitter) Profile URL
              </label>
              <Input
                value={xUrl}
                onChange={(e) => setXUrl(e.target.value)}
                placeholder="https://x.com/username"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Telegram Username / URL
              </label>
              <Input
                value={telegramUrl}
                onChange={(e) => setTelegramUrl(e.target.value)}
                placeholder="https://t.me/username"
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Discord Handle
            </label>
            <Input
              value={discordHandle}
              onChange={(e) => setDiscordHandle(e.target.value)}
              placeholder="username#1234"
            />
          </div>

          <div style={{ marginTop: spacing["4"] }}>
            <Button
              type="submit"
              variant="liquid-metal"
              size="lg"
              loading={isSaving}
              style={{ width: "100%" }}
            >
              Save Profile & Enter Platform
            </Button>
          </div>
        </form>
      </Card>

      {/* Preview Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: spacing["4"] }}>
        <Card
          style={{
            backgroundColor: color.background.cardElevated,
            border: `1px solid ${color.border.subtle}`,
            padding: spacing["6"],
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, marginBottom: spacing["4"] }}>
            Reputation Preview
          </h3>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
              marginBottom: spacing["2"],
            }}
          >
            <span
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: color.brand.accentElectric,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {calculatedPreviewPoints}
            </span>
            <span style={{ fontSize: "14px", color: color.text.muted }}>/ 1000 pts</span>
          </div>

          <div
            style={{
              padding: "4px 10px",
              borderRadius: radius.md,
              backgroundColor: color.brand.primaryGlow + "22",
              color: color.brand.primaryLight,
              fontSize: "13px",
              fontWeight: 600,
              display: "inline-block",
              marginBottom: spacing["4"],
            }}
          >
            {formatTier(user?.tier || 1)}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "12px",
              color: color.text.secondary,
              borderTop: `1px solid ${color.border.subtle}`,
              paddingTop: spacing["3"],
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Wallet Connected</span>
              <span style={{ color: color.status.success }}>+10 pts</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Username Set</span>
              <span style={{ color: username ? color.status.success : color.text.muted }}>
                {username ? "+20 pts" : "0 pts"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Email Verified</span>
              <span style={{ color: isEmailVerified ? color.status.success : color.text.muted }}>
                {isEmailVerified ? "+40 pts" : "0 pts"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Social Links</span>
              <span style={{ color: color.text.muted }}>+10 pts each</span>
            </div>
          </div>
        </Card>

        <Card
          style={{
            backgroundColor: color.background.card,
            border: `1px solid ${color.border.subtle}`,
            padding: spacing["4"],
            fontSize: "12px",
            color: color.text.secondary,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, color: color.text.primary, marginBottom: "4px" }}>
            Pool Participation Gate
          </div>
          Username dan email yang terverifikasi wajib dimiliki sebelum dapat bergabung ke dalam pool
          mana pun.
        </Card>
      </div>
    </div>
  );
};
