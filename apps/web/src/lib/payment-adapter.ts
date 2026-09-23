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
 * Keccak256 hash first 4 bytes: 0xa962657e (or custom ABI encoding)
 */
function encodePayContributionCall(groupId: number | bigint, cycleNumber: number | bigint): string {
  // 4-byte selector for payContribution(uint256,uint256)
  const selector = "0xa962657e";
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
    const walletAddress = await getWalletAddress();

    // Use contract mode only if contract address is configured and not forced demo mode
    if (this.contractAddress && !DEMO_MODE_FORCED && walletAddress) {
      try {
        const targetGroupId = params.contractGroupId
          ? BigInt(params.contractGroupId)
          : BigInt(params.groupId.replace(/[^0-9]/g, "") || "1");

        const data = encodePayContributionCall(targetGroupId, params.cycleNumber);

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
      } catch (err) {
        console.warn("Contract transaction failed or rejected, falling back to demo simulation:", err);
        const randomHex = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        return {
          txHash: `fallback-tx-${randomHex}`,
          mode: "demo",
        };
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
