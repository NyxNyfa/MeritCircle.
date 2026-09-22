"use client";

import React, { useState } from "react";
import { color, radius, spacing, Card, Badge, Button } from "@merit-circle/ui";
import { formatWeiToBnb, formatDate } from "../../lib/format";
import { createPaymentIntent, confirmContribution } from "../../lib/api";
import { payContribution } from "../../lib/payment-adapter";
import { getErrorMessage } from "../../lib/error";
import { CheckIcon, AlertTriangleIcon } from "../layout/Icons";

export interface ContributionItem {
  id: string;
  groupId: string;
  cycleId: string;
  cycleNumber: number;
  amountWei: string;
  dueDate: string;
  status: "PENDING" | "PAID_ON_TIME" | "PAID_LATE" | "DEFAULTED";
  groupName?: string;
  latePenaltyPoints?: number;
}

export const PaymentCard: React.FC<{
  contribution: ContributionItem;
  onPaymentSuccess?: () => void;
}> = ({ contribution, onPaymentSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPaid = contribution.status === "PAID_ON_TIME" || contribution.status === "PAID_LATE";
  const isLate = new Date() > new Date(contribution.dueDate) && !isPaid;

  const handlePay = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // 1. Create payment intent
      setStep("Creating payment intent...");
      const { intent } = await createPaymentIntent(contribution.id);

      // 2. Broadcast on-chain or demo payment
      setStep("Processing transaction...");
      const paymentResult = await payContribution({
        cycleId: contribution.cycleId,
        groupId: contribution.groupId,
        cycleNumber: contribution.cycleNumber,
        amountWei: contribution.amountWei,
      });

      // 3. Confirm with backend
      setStep("Confirming payment with backend...");
      await confirmContribution(intent.id, paymentResult.txHash);

      setTxHash(paymentResult.txHash);
      setStep("Payment confirmed!");
      onPaymentSuccess?.();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card
      liquid
      variant={isLate ? "liquid" : "gold"}
      style={{
        borderRadius: radius.xl,
        padding: spacing["6"],
        marginBottom: spacing["4"],
        borderColor: isLate ? "rgba(239, 68, 68, 0.4)" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing["4"] }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: color.text.primary }}>
              Cycle #{contribution.cycleNumber} Contribution
            </span>
            <Badge variant={isPaid ? "success" : isLate ? "danger" : "warning"}>
              {contribution.status}
            </Badge>
          </div>
          <div style={{ fontSize: "12px", color: color.text.muted }}>
            Group ID: {contribution.groupId} • Due: {formatDate(contribution.dueDate)}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: color.brand.accentElectric }}>
            {formatWeiToBnb(contribution.amountWei)}
          </div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: isLate ? color.status.error : color.text.muted, marginTop: "2px" }}>
            {isLate ? "Overdue: -10 pts/day penalty" : "Due on time (+10 reputation) • Late penalty: -10 pts/day"}
          </div>
        </div>
      </div>

      {/* Demo payment banner with glassmorphic container */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(12, 15, 24, 0.6)",
          backdropFilter: "blur(12px)",
          padding: `${spacing["2"]} ${spacing["3"]}`,
          borderRadius: radius.md,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
          marginBottom: spacing["4"],
          fontSize: "12px",
          color: color.text.secondary,
        }}
      >
        <span>Testnet Mode: Demo Payment Adapter Active</span>
        <span style={{ color: color.brand.accentCyan, fontWeight: 600 }}>Instant Simulation</span>
      </div>

      {step && (
        <div style={{ fontSize: "12px", color: color.brand.accentCyan, marginBottom: spacing["3"] }}>
          {step}
        </div>
      )}

      {txHash && (
        <div
          style={{
            padding: spacing["3"],
            marginBottom: spacing["3"],
            borderRadius: radius.md,
            backgroundColor: color.status.successBackground,
            border: `1px solid ${color.status.success}`,
            fontSize: "12px",
            color: color.status.success,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckIcon size={14} />
          <span>Transaction successful: <code style={{ wordBreak: "break-all" }}>{txHash}</code></span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: spacing["3"],
            marginBottom: spacing["3"],
            borderRadius: radius.md,
            backgroundColor: color.status.errorBackground,
            border: `1px solid ${color.status.error}`,
            fontSize: "12px",
            color: color.status.error,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertTriangleIcon size={14} />
          <span>{error}</span>
        </div>
      )}

      {!isPaid && (
        <Button
          variant="liquid-metal"
          size="md"
          loading={isProcessing}
          onClick={handlePay}
          style={{ width: "100%" }}
        >
          Pay {formatWeiToBnb(contribution.amountWei)} Now
        </Button>
      )}
    </Card>
  );
};
