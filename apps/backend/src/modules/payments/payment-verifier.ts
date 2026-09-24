import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  http,
} from "viem";
import { bscTestnet } from "viem/chains";

export type PaymentVerificationErrorCode =
  | "TX_HASH_INVALID"
  | "CHAIN_MISMATCH"
  | "TX_NOT_FOUND"
  | "TX_PENDING"
  | "TX_REVERTED"
  | "TX_WRONG_CONTRACT"
  | "TX_WRONG_PAYER"
  | "TX_WRONG_VALUE"
  | "TX_WRONG_FUNCTION"
  | "TX_WRONG_GROUP"
  | "TX_WRONG_CYCLE"
  | "TX_EVENT_MISMATCH";

export interface PaymentVerificationResult {
  success: boolean;
  txHash?: string;
  from?: string;
  to?: string;
  value?: string;
  blockNumber?: number;
  paymentTimestamp?: Date;
  reason?: string;
  code?: PaymentVerificationErrorCode;
}

export interface PaymentVerifier {
  verifyContribution(params: {
    txHash: string;
    expectedPayerWallet: string;
    expectedAmountWei: string;
    expectedGroupId: string;
    expectedCycleNumber: number;
  }): Promise<PaymentVerificationResult>;
}

const configuredRpcUrl =
  process.env.BNB_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL;
const configuredContractAddress =
  process.env.CONTRACT_ADDRESS ||
  (process.env.NODE_ENV !== "production"
    ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    : undefined);

if (
  process.env.NODE_ENV === "production" &&
  (!configuredRpcUrl || !configuredContractAddress)
) {
  throw new Error(
    "BNB_TESTNET_RPC_URL and CONTRACT_ADDRESS are required in production"
  );
}

const RPC_URL = configuredRpcUrl || "https://bsc-testnet.bnbchain.org";
const EXPECTED_CONTRACT_ADDRESS = (
  configuredContractAddress || "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C"
).toLowerCase();

const PAY_CONTRIBUTION_ABI = [
  {
    type: "function",
    name: "payContribution",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "cycle", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const CONTRIBUTION_PAID_EVENT_ABI = [
  {
    type: "event",
    name: "ContributionPaid",
    anonymous: false,
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "cycle", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

function failure(
  code: PaymentVerificationErrorCode,
  reason: string
): PaymentVerificationResult {
  return { success: false, code, reason };
}

function normalizeTxHash(txHash: string): string | null {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return null;
  return txHash.toLowerCase();
}

export class OnChainPaymentVerifier implements PaymentVerifier {
  private client = createPublicClient({
    chain: bscTestnet,
    transport: http(RPC_URL),
  });

  async verifyContribution(params: {
    txHash: string;
    expectedPayerWallet: string;
    expectedAmountWei: string;
    expectedGroupId: string;
    expectedCycleNumber: number;
  }): Promise<PaymentVerificationResult> {
    const txHash = normalizeTxHash(params.txHash);
    if (!txHash) {
      return failure(
        "TX_HASH_INVALID",
        "Format transaction hash tidak valid. Harus berupa 0x diikuti 64 karakter heksadesimal."
      );
    }

    try {
      const chainId = await this.client.getChainId();
      if (chainId !== bscTestnet.id) {
        return failure(
          "CHAIN_MISMATCH",
          `RPC terhubung ke chain ${chainId}, bukan BNB Smart Chain Testnet (97).`
        );
      }

      const tx = await this.client.getTransaction({
        hash: txHash as `0x${string}`,
      });

      let receipt;
      try {
        receipt = await this.client.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          confirmations: 1,
          timeout: 60_000,
        });
      } catch {
        try {
          receipt = await this.client.getTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
        } catch {
          return failure(
            "TX_PENDING",
            "Transaksi belum memiliki receipt. Status belum dapat diverifikasi."
          );
        }
      }

      if (!receipt) {
        return failure(
          "TX_PENDING",
          "Transaksi belum memiliki receipt. Status belum dapat diverifikasi."
        );
      }
      if (receipt.status !== "success") {
        return failure(
          "TX_REVERTED",
          "Transaksi mengalami revert (gagal) pada smart contract. Tidak ada pembayaran yang dicatat."
        );
      }

      const targetAddress = (receipt.to || tx.to || "").toLowerCase();
      if (targetAddress !== EXPECTED_CONTRACT_ADDRESS) {
        return failure(
          "TX_WRONG_CONTRACT",
          `Tujuan transaksi tidak cocok dengan smart contract Merit Circle yang dikonfigurasi.`
        );
      }
      if (tx.from.toLowerCase() !== params.expectedPayerWallet.toLowerCase()) {
        return failure(
          "TX_WRONG_PAYER",
          "Pengirim transaksi tidak cocok dengan dompet anggota yang terdaftar."
        );
      }
      if (tx.value.toString() !== BigInt(params.expectedAmountWei).toString()) {
        return failure(
          "TX_WRONG_VALUE",
          "Nominal transaksi tidak cocok dengan jumlah iuran yang diwajibkan."
        );
      }

      let decodedCall;
      try {
        decodedCall = decodeFunctionData({
          abi: PAY_CONTRIBUTION_ABI,
          data: tx.input,
        });
      } catch {
        return failure(
          "TX_WRONG_FUNCTION",
          "Calldata transaksi bukan payContribution(uint256,uint256)."
        );
      }
      if (decodedCall.functionName !== "payContribution") {
        return failure(
          "TX_WRONG_FUNCTION",
          "Fungsi smart contract yang dipanggil bukan payContribution."
        );
      }

      const [callGroupId, callCycle] = decodedCall.args;
      const expectedGroupId = BigInt(params.expectedGroupId);
      const expectedCycle = BigInt(params.expectedCycleNumber);
      if (callGroupId !== expectedGroupId) {
        return failure(
          "TX_WRONG_GROUP",
          "Group ID pada calldata tidak cocok dengan iuran yang dikonfirmasi."
        );
      }
      if (callCycle !== expectedCycle) {
        return failure(
          "TX_WRONG_CYCLE",
          "Cycle pada calldata tidak cocok dengan iuran yang dikonfirmasi."
        );
      }

      const matchingEvents: Array<{
        timestamp: bigint;
        payer: string;
        amount: bigint;
      }> = [];

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== targetAddress) continue;
        try {
          const decodedEvent = decodeEventLog({
            abi: CONTRIBUTION_PAID_EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decodedEvent.eventName !== "ContributionPaid") continue;
          const { groupId: eventGroupId, cycle: eventCycle, payer, amount, timestamp } =
            decodedEvent.args;
          if (
            eventGroupId === expectedGroupId &&
            eventCycle === expectedCycle &&
            String(payer).toLowerCase() === params.expectedPayerWallet.toLowerCase() &&
            amount === BigInt(params.expectedAmountWei)
          ) {
            matchingEvents.push({ payer: String(payer), amount, timestamp });
          }
        } catch {
          continue;
        }
      }

      if (matchingEvents.length !== 1) {
        return failure(
          "TX_EVENT_MISMATCH",
          "Receipt tidak memuat tepat satu event ContributionPaid yang cocok dengan group, cycle, pengirim, dan nominal."
        );
      }

      return {
        success: true,
        txHash,
        from: tx.from,
        to: targetAddress,
        value: tx.value.toString(),
        blockNumber: Number(receipt.blockNumber),
        paymentTimestamp: new Date(Number(matchingEvents[0].timestamp) * 1000),
      };
    } catch (error: any) {
      return failure(
        "TX_NOT_FOUND",
        `Verifikasi on-chain gagal: ${error?.message || "Kesalahan jaringan RPC"}`
      );
    }
  }
}

export class TestPaymentVerifier implements PaymentVerifier {
  async verifyContribution(params: {
    txHash: string;
    expectedPayerWallet: string;
    expectedAmountWei: string;
    expectedGroupId: string;
    expectedCycleNumber: number;
  }): Promise<PaymentVerificationResult> {
    const txHash = normalizeTxHash(params.txHash);
    if (!txHash || txHash.startsWith("0xfail")) {
      return failure(
        "TX_REVERTED",
        "Transaksi mengalami revert (gagal) pada smart contract. Tidak ada pembayaran yang dicatat."
      );
    }

    return {
      success: true,
      txHash,
      from: params.expectedPayerWallet,
      value: params.expectedAmountWei,
      blockNumber: 1234567,
    };
  }
}

export let paymentVerifier: PaymentVerifier = new OnChainPaymentVerifier();

export function setPaymentVerifier(verifier: PaymentVerifier): void {
  paymentVerifier = verifier;
}
