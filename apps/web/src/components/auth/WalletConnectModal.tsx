"use client";

import React from "react";
import { color, radius, spacing, Button, Card } from "@merit-circle/ui";
import { useWallet } from "../../hooks/useWallet";
import { useAuth } from "../../hooks/useAuth";
import { XIcon, LockIcon } from "../layout/Icons";

export interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { isConnected, isCorrectNetwork, switchNetwork, error: walletError } = useWallet();
  const { loginWithWallet, isLoading, error: authError } = useAuth();

  if (!isOpen) return null;

  const handleConnectAndSign = async () => {
    const ok = await loginWithWallet();
    if (ok) {
      onSuccess?.();
      onClose();
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
          maxWidth: "460px",
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
            Connect Your Wallet
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

        <p style={{ fontSize: "14px", color: color.text.secondary, marginBottom: spacing["6"] }}>
          Merit Circle runs on BNB Smart Chain Testnet. Connect your wallet to access ROSCA pools,
          bidding rooms, and reputation tracking.
        </p>

        {isConnected && !isCorrectNetwork && (
          <div
            style={{
              padding: spacing["3"],
              marginBottom: spacing["4"],
              borderRadius: radius.md,
              backgroundColor: color.status.warningBackground,
              border: `1px solid ${color.status.warning}`,
              fontSize: "13px",
              color: color.status.warning,
            }}
          >
            Wrong network detected. Please switch to BNB Testnet (Chain ID 97).
            <div style={{ marginTop: "8px" }}>
              <Button size="sm" variant="outline" onClick={switchNetwork}>
                Switch to BNB Testnet
              </Button>
            </div>
          </div>
        )}

        {(walletError || authError) && (
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
            {walletError || authError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: spacing["3"] }}>
          <Button
            variant="liquid-metal"
            size="lg"
            loading={isLoading}
            onClick={handleConnectAndSign}
          >
            Connect Web3 Wallet
          </Button>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div
          style={{
            marginTop: spacing["6"],
            borderTop: `1px solid ${color.border.subtle}`,
            paddingTop: spacing["4"],
            fontSize: "12px",
            color: color.text.muted,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <LockIcon size={14} />
          <span>Non-custodial & secure. No private keys are ever stored or shared.</span>
        </div>
      </Card>
    </div>
  );
};
