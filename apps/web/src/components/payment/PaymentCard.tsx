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
  contractGroupId?: string;
  groupNumber?: number;
  groupCurrentCycle?: number;
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
  const currentActiveCycle = contribution.groupCurrentCycle || 1;
  const isUpcomingCycle = contribution.cycleNumber > currentActiveCycle;

  const handlePay = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // 1. Create payment intent
      setStep("Creating payment intent...");
      const res = await createPaymentIntent(contribution.id, contribution.cycleId);
      const intentId =
        res?.intent?.id ||
        res?.intent?.contributionId ||
        (res as any)?.id ||
        (res as any)?.contributionId ||
        contribution.id;
      const targetContractAddress =
        res?.intent?.contractAddress ||
        (res as any)?.contractAddress ||
        "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C";

      // 2. Broadcast on-chain transaction with MetaMask
      setStep("Menunggu konfirmasi transaksi di dompet Web3 (MetaMask)...");
      const paymentResult = await payContribution({
        cycleId: contribution.cycleId,
        groupId: contribution.groupId,
        contractGroupId: contribution.contractGroupId || String(contribution.groupNumber || 1),
        contractAddress: targetContractAddress,
        cycleNumber: contribution.cycleNumber,
        amountWei: contribution.amountWei,
      });

      // 3. Confirm with backend
      setStep("Memverifikasi dan mencatat transaksi di sistem...");
      await confirmContribution(intentId, paymentResult.txHash, contribution.cycleId);

      setTxHash(paymentResult.txHash);
      setStep("Pembayaran berhasil diverifikasi!");
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
              Cycle #{contribution.cycleNumber} Contribution {isUpcomingCycle && "(Siklus Mendatang)"}
            </span>
            <Badge variant={isPaid ? "success" : isLate ? "danger" : isUpcomingCycle ? "neutral" : "warning"}>
              {isPaid ? "PAID" : isUpcomingCycle ? "UPCOMING" : "PENDING"}
            </Badge>
          </div>
          <div style={{ fontSize: "12px", color: color.text.muted }}>
            Group #{contribution.groupNumber || 1} • Due: {formatDate(contribution.dueDate)}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: color.brand.accentElectric }}>
            {formatWeiToBnb(contribution.amountWei)}
          </div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: isLate ? color.status.error : color.text.muted, marginTop: "2px" }}>
            {isLate ? "Overdue: -10 pts/day penalty" : "Due on time (+50 reputation) • Early bonus: +10 pts"}
          </div>
        </div>
      </div>

      {/* Live Web3 Smart Contract Banner */}
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
        <span>BNB Smart Chain Testnet (ID: 97)</span>
        <span style={{ color: color.brand.accentElectric, fontWeight: 600 }}>
          Smart Contract: 0x71a4...2A8C
        </span>
      </div>

      {isUpcomingCycle && !isPaid && (
        <div
          style={{
            padding: spacing["3"],
            marginBottom: spacing["3"],
            borderRadius: radius.md,
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            fontSize: "12px",
            color: "#60a5fa",
            lineHeight: 1.5,
          }}
        >
          ⏱ <strong>Siklus #{contribution.cycleNumber} Terjadwal (1 Bulan):</strong> Tagihan ini dibuka setelah Siklus #{currentActiveCycle} selesai dan diselesaikan oleh kontrak arisan.
        </div>
      )}

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
          <span>Transaksi on-chain berhasil: <code style={{ wordBreak: "break-all" }}>{txHash}</code></span>
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
          disabled={isUpcomingCycle}
          onClick={handlePay}
          style={{ width: "100%" }}
        >
          {isUpcomingCycle
            ? `Siklus #${contribution.cycleNumber} Menunggu Siklus #${currentActiveCycle}`
            : `Pay ${formatWeiToBnb(contribution.amountWei)} via MetaMask (tBNB)`}
        </Button>
      )}
    </Card>
  );
};
