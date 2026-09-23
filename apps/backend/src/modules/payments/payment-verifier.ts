import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";

export interface PaymentVerifier {
  verifyContribution(params: {
    txHash: string;
    expectedPayerWallet: string;
    expectedAmountWei: string;
  }): Promise<{
    success: boolean;
    from?: string;
    value?: string;
    blockNumber?: number;
    reason?: string;
  }>;
}

const RPC_URL =
  process.env.BNB_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL ||
  "https://bsc-testnet.bnbchain.org";

const EXPECTED_CONTRACT_ADDRESS = (
  process.env.CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C"
).toLowerCase();

/**
 * Production On-Chain Payment Verifier.
 * Verifies live transaction receipts and block confirmations via BNB Smart Chain Testnet RPC / block scan.
 */
export class OnChainPaymentVerifier implements PaymentVerifier {
  private client = createPublicClient({
    chain: bscTestnet,
    transport: http(RPC_URL),
  });

  async verifyContribution(params: {
    txHash: string;
    expectedPayerWallet: string;
    expectedAmountWei: string;
  }): Promise<{
    success: boolean;
    from?: string;
    value?: string;
    blockNumber?: number;
    reason?: string;
  }> {
    const { txHash, expectedPayerWallet, expectedAmountWei } = params;

    if (!txHash || !txHash.startsWith("0x") || txHash.length !== 66) {
      return {
        success: false,
        reason: "Format txHash tidak valid. Harus diawali 0x dengan panjang 66 karakter.",
      };
    }

    try {
      // 1. Fetch transaction receipt directly from the BNB Smart Chain block scan / RPC
      const receipt = await this.client.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      if (!receipt) {
        return {
          success: false,
          reason: "Transaksi belum ditambang atau tidak ditemukan di block scan BNB Smart Chain Testnet.",
        };
      }

      if (receipt.status !== "success") {
        return {
          success: false,
          reason: "Transaksi mengalami revert (gagal) pada smart contract.",
        };
      }

      // 2. Fetch transaction details for payer and value verification
      const tx = await this.client.getTransaction({
        hash: txHash as `0x${string}`,
      });

      if (!tx) {
        return {
          success: false,
          reason: "Detail transaksi tidak dapat diambil dari block scan.",
        };
      }

      // 3. Verify destination contract address
      const targetAddress = (receipt.to || tx.to || "").toLowerCase();
      if (targetAddress !== EXPECTED_CONTRACT_ADDRESS) {
        return {
          success: false,
          reason: `Tujuan transaksi (${targetAddress}) tidak cocok dengan smart contract Merit Circle (${EXPECTED_CONTRACT_ADDRESS}).`,
        };
      }

      // 4. Verify sender wallet matches expected payer
      if (tx.from.toLowerCase() !== expectedPayerWallet.toLowerCase()) {
        return {
          success: false,
          reason: `Pengirim transaksi (${tx.from}) tidak cocok dengan dompet anggota yang terdaftar (${expectedPayerWallet}).`,
        };
      }

      // 5. Verify transferred value matches expected contribution
      if (tx.value.toString() !== expectedAmountWei) {
        return {
          success: false,
          reason: `Nominal transaksi (${tx.value.toString()} wei) tidak cocok dengan jumlah iuran yang diwajibkan (${expectedAmountWei} wei).`,
        };
      }

      return {
        success: true,
        from: tx.from,
        value: tx.value.toString(),
        blockNumber: Number(receipt.blockNumber),
      };
    } catch (err: any) {
      console.error("[OnChainPaymentVerifier] Block scan verification error:", err);
      return {
        success: false,
        reason: `Verifikasi on-chain block scan gagal: ${err?.message || "Kesalahan jaringan RPC"}`,
      };
    }
  }
}

export class TestPaymentVerifier implements PaymentVerifier {
  async verifyContribution(params: {
    txHash: string;
    expectedPayerWallet: string;
    expectedAmountWei: string;
  }): Promise<{
    success: boolean;
    from?: string;
    value?: string;
    blockNumber?: number;
    reason?: string;
  }> {
    if (
      !params.txHash ||
      params.txHash.trim() === "" ||
      params.txHash === "invalid-tx-hash" ||
      params.txHash.startsWith("fail")
    ) {
      return {
        success: false,
        reason: "Transaction verification failed on chain",
      };
    }

    return {
      success: true,
      from: params.expectedPayerWallet,
      value: params.expectedAmountWei,
      blockNumber: 1234567,
    };
  }
}

// In production, default strictly to real OnChainPaymentVerifier
export let paymentVerifier: PaymentVerifier =
  process.env.NODE_ENV === "test"
    ? new TestPaymentVerifier()
    : new OnChainPaymentVerifier();

export function setPaymentVerifier(verifier: PaymentVerifier): void {
  paymentVerifier = verifier;
}
