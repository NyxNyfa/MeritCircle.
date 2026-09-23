/**
 * Merit Circle Payment Adapter
 * Pure On-Chain Web3 Payment Mode (BNB Smart Chain Testnet).
 */

import { sendContractTransaction, getWalletAddress } from "./wallet";

export interface PaymentAdapter {
  payContribution(params: {
    cycleId: string;
    groupId: string;
    contractGroupId?: string;
    contractAddress?: string;
    cycleNumber: number;
    amountWei: string;
  }): Promise<{
    txHash: string;
    mode: "contract";
  }>;
}

export const DEFAULT_CONTRACT_ADDRESS = "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C";

const CONTRACT_ADDRESS =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) ||
  DEFAULT_CONTRACT_ADDRESS;

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
    contractAddress?: string;
    cycleNumber: number;
    amountWei: string;
  }): Promise<{
    txHash: string;
    mode: "contract";
  }> {
    const targetContract =
      params.contractAddress ||
      this.contractAddress ||
      DEFAULT_CONTRACT_ADDRESS;

    const walletAddress = await getWalletAddress();
    if (!walletAddress) {
      throw new Error(
        "Dompet Web3 belum terhubung. Silakan klik 'Connect Wallet' di kanan atas terlebih dahulu untuk membayar via MetaMask (tBNB)."
      );
    }

    const targetGroupId = params.contractGroupId
      ? BigInt(params.contractGroupId)
      : BigInt(params.groupId.replace(/[^0-9]/g, "") || "1");

    const data = encodePayContributionCall(targetGroupId, params.cycleNumber);

    try {
      const txHash = await sendContractTransaction({
        to: targetContract,
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
}

export const paymentAdapter = new DefaultPaymentAdapter();

export async function payContribution(params: {
  cycleId: string;
  groupId: string;
  contractGroupId?: string;
  contractAddress?: string;
  cycleNumber: number;
  amountWei: string;
}): Promise<{
  txHash: string;
  mode: "contract";
}> {
  return paymentAdapter.payContribution(params);
}
