"use client";

import React, { useEffect, useState } from "react";
import { color, radius, spacing, Card, Badge, Button } from "@merit-circle/ui";
import { formatWeiToBnb, formatDate } from "../../lib/format";
import { createPaymentIntent, confirmContribution } from "../../lib/api";
import { payContribution } from "../../lib/payment-adapter";
import { waitForTransactionReceipt } from "../../lib/wallet";
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
  cycleStatus?: string;
  isPayable?: boolean;
  poolName?: string;
  poolMode?: string;
  externalPoolId?: string;
  amountWei: string;
  dueDate: string;
  status: "PENDING" | "PAID_ON_TIME" | "PAID_LATE" | "UNPAID";
  groupName?: string;
  latePenaltyPoints?: number;
}

function paymentAttemptKey(contributionId: string): string {
  return `merit_circle_payment_attempt_${contributionId}`;
}

function readPaymentAttempt(contributionId: string): {
  intentId: string;
  txHash: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(paymentAttemptKey(contributionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed?.intentId &&
      parsed?.txHash &&
      /^0x[0-9a-fA-F]{64}$/.test(parsed.txHash)
    ) {
      return { intentId: parsed.intentId, txHash: parsed.txHash.toLowerCase() };
    }
  } catch {
    return null;
  }
  return null;
}

function writePaymentAttempt(
  contributionId: string,
  attempt: { intentId: string; txHash: string }
) {
  try {
    window.localStorage.setItem(
      paymentAttemptKey(contributionId),
      JSON.stringify(attempt)
    );
  } catch {}
}

function clearPaymentAttempt(contributionId: string) {
  try {
    window.localStorage.removeItem(paymentAttemptKey(contributionId));
  } catch {}
}

export const PaymentCard: React.FC<{
  contribution: ContributionItem;
  onPaymentSuccess?: () => void;
}> = ({ contribution, onPaymentSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<string>("");
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [failedTxHash, setFailedTxHash] = useState<string | null>(null);
  const [walletRequestPending, setWalletRequestPending] = useState(false);
  const [confirmationAttempt, setConfirmationAttempt] = useState<{
    intentId: string;
    txHash: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const attempt = readPaymentAttempt(contribution.id);
    if (attempt) {
      setConfirmationAttempt(attempt);
      setFailedTxHash(attempt.txHash);
    }
  }, [contribution.id]);

  const isPaid =
    contribution.status === "PAID_ON_TIME" ||
    contribution.status === "PAID_LATE";
  const isLate = new Date() > new Date(contribution.dueDate) && !isPaid;
  const resolvedContractGroupId =
    contribution.contractGroupId ||
    (contribution.groupNumber ? String(contribution.groupNumber) : "1");
  const currentActiveCycle =
    contribution.groupCurrentCycle || 1;
  const isUpcomingCycle =
    !isPaid &&
    (contribution.cycleNumber > currentActiveCycle ||
      (contribution.cycleStatus === "UPCOMING" && contribution.cycleNumber > 1));
  const isPayableNow =
    !isPaid &&
    !isUpcomingCycle &&
    (contribution.isPayable === true ||
      contribution.cycleStatus === "PAYMENT_OPEN" ||
      contribution.cycleNumber <= currentActiveCycle);

  const confirmOnBackend = async (intentId: string, txHash: string) => {
    setStep("Menerima konfirmasi backend dan memverifikasi event on-chain...");
    const confirmation = await confirmContribution(
      intentId,
      txHash,
      contribution.cycleId
    );
    const confirmedContributionId =
      confirmation.contributionId ||
      confirmation.contribution?.contributionId ||
      confirmation.contribution?.id;
    const confirmedStatus =
      confirmation.status ||
      confirmation.contribution?.status ||
      confirmation.payment?.status;
    const confirmedHash = (
      confirmation.payment?.txHash ||
      (confirmation as any).txHash ||
      txHash
    )?.toLowerCase();

    const isConfirmedStatus =
      confirmedStatus === "PAID_ON_TIME" || confirmedStatus === "PAID_LATE";
    const isMatchingId =
      !confirmedContributionId || confirmedContributionId === contribution.id;
    const isMatchingHash =
      !confirmedHash || confirmedHash === txHash.toLowerCase();

    if (!isConfirmedStatus || !isMatchingId || !isMatchingHash) {
      throw new Error(
        "Konfirmasi backend tidak cocok dengan transaksi yang baru dikirim. Status iuran belum diubah menjadi lunas."
      );
    }

    clearPaymentAttempt(contribution.id);
    setConfirmationAttempt(null);
    setSubmittedTxHash(null);
    setFailedTxHash(null);
    setTxHash(txHash);
    setStep("Pembayaran berhasil diverifikasi on-chain.");
    onPaymentSuccess?.();
  };

  const resumePaymentConfirmation = async (
    attempt: { intentId: string; txHash: string }
  ) => {
    setIsProcessing(true);
    setError(null);
    setStep("Memeriksa ulang receipt transaksi sebelumnya...");
    try {
      await waitForTransactionReceipt(attempt.txHash);
      await confirmOnBackend(attempt.intentId, attempt.txHash);
    } catch (err: any) {
      setFailedTxHash(err?.txHash || attempt.txHash);
      setStep("");
      if (err?.code === "ONCHAIN_REVERTED") {
        setConfirmationAttempt(null);
        setError(
          "Receipt transaksi sebelumnya menunjukkan revert. Tidak ada pembayaran yang dicatat; Anda dapat mencoba pembayaran baru."
        );
      } else if (err?.code === "RECEIPT_PENDING") {
        setError(
          "Receipt transaksi sebelumnya belum tersedia. Tombol hanya akan memeriksa hash yang sama, tidak mengirim transaksi baru."
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePay = async () => {
    if (confirmationAttempt) {
      await resumePaymentConfirmation(confirmationAttempt);
      return;
    }

    setIsProcessing(true);
    setStep("Menyiapkan pembayaran on-chain...");
    setError(null);
    setTxHash(null);
    setSubmittedTxHash(null);
    setFailedTxHash(null);
    setConfirmationAttempt(null);
    clearPaymentAttempt(contribution.id);
    setWalletRequestPending(false);
    let currentTxHash: string | null = null;
    let currentIntentId = contribution.id;

    try {
      const res = await createPaymentIntent(contribution.id, contribution.cycleId);
      const intent = res.intent || res;
      const intentId =
        intent.id || intent.contributionId || contribution.id;
      currentIntentId = intentId;
      const targetContractGroupId = String(
        intent.contractGroupId ||
        contribution.contractGroupId ||
        (contribution.groupNumber ? String(contribution.groupNumber) : "1")
      );
      const contractAddress =
        intent.contractAddress ||
        (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) ||
        "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C";

      setStep("Menunggu persetujuan transaksi di Rabby Wallet...");
      const paymentResult = await payContribution({
        cycleId: contribution.cycleId,
        groupId: contribution.groupId,
        contractGroupId: targetContractGroupId,
        contractAddress,
        cycleNumber: contribution.cycleNumber,
        amountWei: contribution.amountWei,
        onSubmitted: (hash) => {
          currentTxHash = hash;
          const attempt = { intentId: currentIntentId, txHash: hash };
          writePaymentAttempt(contribution.id, attempt);
          setConfirmationAttempt(attempt);
          setSubmittedTxHash(hash);
          setStep(
            "Transaksi disiarkan. Menunggu receipt sukses pada BNB Smart Chain Testnet..."
          );
        },
      });

      const attempt = { intentId, txHash: paymentResult.txHash };
      writePaymentAttempt(contribution.id, attempt);
      setConfirmationAttempt(attempt);
      await confirmOnBackend(intentId, paymentResult.txHash);
    } catch (err: any) {
      setSubmittedTxHash(null);
      setFailedTxHash(err?.txHash || currentTxHash);
      setStep("");

      const canResumeConfirmation =
        Boolean(currentTxHash) &&
        err?.code !== "USER_REJECTED" &&
        err?.code !== "ONCHAIN_REVERTED" &&
        err?.code !== "WALLET_TRANSACTION_FAILED";
      if (canResumeConfirmation) {
        const attempt = {
          intentId: currentIntentId,
          txHash: currentTxHash!,
        };
        writePaymentAttempt(contribution.id, attempt);
        setConfirmationAttempt(attempt);
      } else {
        clearPaymentAttempt(contribution.id);
        setConfirmationAttempt(null);
      }

      const errMsg = String(err?.message || "").toLowerCase();
      if (
        err?.code === "USER_REJECTED" ||
        errMsg.includes("user rejected") ||
        errMsg.includes("user denied") ||
        errMsg.includes("rejected by user")
      ) {
        setWalletRequestPending(false);
        setError(
          "Transaksi dibatalkan oleh pengguna di dompet (Rabby/MetaMask). Tidak ada pembayaran yang dicatat; Anda dapat mencoba kembali kapan saja."
        );
      } else if (err?.code === "ONCHAIN_REVERTED" || errMsg.includes("revert")) {
        setWalletRequestPending(false);
        setError(
          "Transaksi on-chain gagal/revert di smart contract. Tidak ada pembayaran yang dicatat; periksa transaction hash lalu coba kembali. Pastikan saldo tBNB mencukupi."
        );
      } else if (errMsg.includes("insufficient funds") || errMsg.includes("exceeds balance")) {
        setWalletRequestPending(false);
        setError(
          "Saldo tBNB di dompet Anda tidak mencukupi untuk membayar iuran dan biaya gas jaringan BNB Smart Chain Testnet."
        );
      } else if (err?.code === "RECEIPT_PENDING") {
        setError(
          "Status transaksi belum dapat dipastikan karena receipt belum tersedia di blockchain. Jangan kirim transaksi baru sebelum memeriksa hash."
        );
      } else if (err?.code === "WALLET_REQUEST_PENDING") {
        setError(
          "Permintaan ke dompet Web3 belum selesai atau tertutup. Silakan periksa notifikasi Rabby/MetaMask atau klik 'Coba Bayar Lagi'."
        );
      } else {
        setWalletRequestPending(false);
        setError(getErrorMessage(err));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card
      liquid
      variant={isLate ? "liquid" : "gold"}
      data-testid={`payment-card-${contribution.id}`}
      data-payment-status={isPaid ? "paid" : "pending"}
      style={{
        borderRadius: radius.xl,
        padding: spacing["6"],
        marginBottom: spacing["4"],
        borderColor: isLate ? "rgba(239, 68, 68, 0.4)" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing["4"] }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: color.text.primary }}>
              {contribution.poolName ? `${contribution.poolName} — ` : ""}Cycle #{contribution.cycleNumber} Contribution {isUpcomingCycle && "(Siklus Mendatang)"}
            </span>
            {contribution.poolMode && (
              <Badge variant={contribution.poolMode === "AUCTION" ? "info" : "neutral"} size="sm">
                {contribution.poolMode === "AUCTION" ? "Auction" : "Basic"}
              </Badge>
            )}
            <Badge data-testid="payment-status" variant={isPaid ? "success" : isLate ? "danger" : isUpcomingCycle ? "neutral" : "warning"}>
              {isPaid ? "PAID" : isUpcomingCycle ? "UPCOMING" : "PAYMENT OPEN"}
            </Badge>
          </div>
          <div style={{ fontSize: "12px", color: color.text.muted }}>
            Group #{contribution.groupNumber || 1} (Contract ID: {resolvedContractGroupId ? `#${resolvedContractGroupId}` : "belum terdaftar"}) • Due: {formatDate(contribution.dueDate)}
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
          <strong>Siklus #{contribution.cycleNumber} Terjadwal:</strong> Tagihan ini dibuka setelah Siklus #{currentActiveCycle} selesai dan diselesaikan oleh kontrak arisan.
        </div>
      )}

      {step && (
        <div data-testid="payment-step" aria-live="polite" style={{ fontSize: "12px", color: color.brand.accentCyan, marginBottom: spacing["3"] }}>
          {step}
        </div>
      )}

      {submittedTxHash && (
        <div
          data-testid="payment-pending"
          style={{
            padding: spacing["3"],
            marginBottom: spacing["3"],
            borderRadius: radius.md,
            backgroundColor: "rgba(0, 197, 248, 0.08)",
            border: `1px solid ${color.brand.primary}`,
            color: color.text.secondary,
            fontSize: "12px",
            wordBreak: "break-all",
          }}
        >
          Menunggu receipt: <code>{submittedTxHash}</code>
        </div>
      )}

      {txHash && (
        <div
          data-testid="payment-success"
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
          data-testid="payment-error"
          role="alert"
          aria-live="assertive"
          style={{
            padding: spacing["3"],
            marginBottom: spacing["3"],
            borderRadius: radius.md,
            backgroundColor: color.status.errorBackground,
            border: `1px solid ${color.status.error}`,
            fontSize: "12px",
            color: color.status.error,
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <AlertTriangleIcon size={14} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: "2px" }}>Pembayaran Belum Berhasil</div>
            <div>{error}</div>
            {failedTxHash && (
              <div style={{ marginTop: "6px", wordBreak: "break-all" }}>
                Hash: <code>{failedTxHash}</code>{" "}
                <a
                  href={`https://testnet.bscscan.com/tx/${failedTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#fff", textDecoration: "underline", marginLeft: "4px" }}
                >
                  Lihat di BscScan
                </a>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                type="button"
                data-testid="payment-retry-button"
                onClick={() => {
                  setError(null);
                  setWalletRequestPending(false);
                  handlePay();
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.25)",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  color: "#fff",
                  borderRadius: radius.sm,
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Coba Bayar Lagi
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setWalletRequestPending(false);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: color.text.muted,
                  borderRadius: radius.sm,
                  padding: "4px 10px",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {!isPaid && (
        isUpcomingCycle ? (
          <div
            data-testid="payment-upcoming-badge"
            style={{
              padding: spacing["3"],
              textAlign: "center",
              borderRadius: radius.md,
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px dashed rgba(255, 255, 255, 0.15)",
              color: color.text.muted,
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            🔒 Tagihan Terkunci • Setelah siklus ke-{Math.max(1, contribution.cycleNumber - 1)} selesai
          </div>
        ) : (
          <Button
            data-testid="payment-button"
            variant="liquid-metal"
            size="md"
            loading={isProcessing}
            disabled={walletRequestPending || !isPayableNow}
            onClick={handlePay}
            style={{ width: "100%" }}
          >
            {walletRequestPending
              ? "Permintaan Dompet Masih Dipantau"
              : confirmationAttempt
              ? "Periksa Status / Konfirmasi Ulang"
              : `Pay ${formatWeiToBnb(contribution.amountWei)} via Rabby/MetaMask`}
          </Button>
        )
      )}
    </Card>
  );
};
