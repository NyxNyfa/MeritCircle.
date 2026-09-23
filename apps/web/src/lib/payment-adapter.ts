/**
 * Merit Circle Payment Adapter
 * Supports Contract Mode (BNB Testnet) and Demo Payment Mode.
 */

import { sendContractTransaction, getWalletAddress } from "./wallet";

export interface PaymentAdapter {
  payContribution(params: {
    cycleId: string;
    groupId: string;
    contractGroupId?: string;
    cycleNumber: number;
    amountWei: string;
  }): Promise<{
    txHash: string;
    mode: "contract" | "demo";
  }>;
}

const CONTRACT_ADDRESS =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) || "";
const DEMO_MODE_FORCED =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE === "true") || false;

/**
 * Encodes payContribution(uint256 groupId, uint256 cycleNumber) selector & arguments.
 * Function signature: "payContribution(uint256,uint256)"
 * Keccak256 hash first 4 bytes: 0x524bbdf9
 */
function encodePayContributionCall(groupId: number | bigint, cycleNumber: number | bigint): string {
  const selector = "0x524bbdf9";
  const arg1 = BigInt(groupId).toString(16).padStart(64, "0");
  const arg2 = BigInt(cycleNumber).toString(16).padStart(64, "0");
  return `${selector}${arg1}${arg2}`;
}

export class DefaultPaymentAdapter implements PaymentAdapter {
  constructor(private contractAddress: string = CONTRACT_ADDRESS) {}

  async payContribution(params: {
    cycleId: string;
    groupId: string;
    contractGroupId?: string;
    cycleNumber: number;
    amountWei: string;
  }): Promise<{
    txHash: string;
    mode: "contract" | "demo";
  }> {
    // Contract Mode: Active when contract address is available and not forced into demo mode
    if (this.contractAddress && !DEMO_MODE_FORCED) {
      const walletAddress = await getWalletAddress();
      if (!walletAddress) {
        throw new Error("Dompet Web3 belum terhubung. Silakan klik 'Connect Wallet' di kanan atas terlebih dahulu.");
      }

      const targetGroupId = params.contractGroupId
        ? BigInt(params.contractGroupId)
        : BigInt(params.groupId.replace(/[^0-9]/g, "") || "1");

      const data = encodePayContributionCall(targetGroupId, params.cycleNumber);

      try {
        const txHash = await sendContractTransaction({
          to: this.contractAddress,
          from: walletAddress,
          data,
          value: params.amountWei,
        });

        return {
          txHash,
          mode: "contract",
        };
      } catch (err: any) {
        console.error("Contract payment transaction failed:", err);
        const errMsg = err?.message || String(err);
        if (errMsg.includes("User rejected") || errMsg.includes("user rejected")) {
          throw new Error("Transaksi dibatalkan oleh pengguna di MetaMask.");
        }
        throw new Error(`Transaksi Smart Contract gagal: ${errMsg}`);
      }
    }

    // Demo Mode: Generate demo transaction hash
    const randomHex = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const txHash = `demo-tx-${randomHex}`;

    return {
      txHash,
      mode: "demo",
    };
  }
}

export const paymentAdapter = new DefaultPaymentAdapter();

export async function payContribution(params: {
  cycleId: string;
  groupId: string;
  contractGroupId?: string;
  cycleNumber: number;
  amountWei: string;
}): Promise<{
  txHash: string;
  mode: "contract" | "demo";
}> {
  return paymentAdapter.payContribution(params);
}
