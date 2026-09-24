import {
  getWalletAddress,
  sendContractTransaction,
  waitForTransactionReceipt,
  type WalletTransactionReceipt,
} from "./wallet";

export interface PaymentAdapter {
  payContribution(params: {
    cycleId: string;
    groupId: string;
    contractGroupId: string;
    contractAddress?: string;
    cycleNumber: number;
    amountWei: string;
    onSubmitted?: (txHash: string) => void;
  }): Promise<{
    txHash: string;
    mode: "contract";
    receipt: WalletTransactionReceipt;
  }>;
}

export const DEFAULT_CONTRACT_ADDRESS = "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C";

const CONTRACT_ADDRESS =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) ||
  DEFAULT_CONTRACT_ADDRESS;

function encodePayContributionCall(
  groupId: number | bigint,
  cycleNumber: number | bigint
): string {
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
    contractGroupId: string;
    contractAddress?: string;
    cycleNumber: number;
    amountWei: string;
    onSubmitted?: (txHash: string) => void;
  }): Promise<{
    txHash: string;
    mode: "contract";
    receipt: WalletTransactionReceipt;
  }> {
    const targetContract =
      params.contractAddress || this.contractAddress || DEFAULT_CONTRACT_ADDRESS;
    const walletAddress = await getWalletAddress();
    if (!walletAddress) {
      throw new Error(
        "Dompet Web3 belum terhubung. Silakan hubungkan dompet di kanan atas sebelum membayar."
      );
    }

    let targetGroupId: bigint;
    try {
      targetGroupId = BigInt(params.contractGroupId);
    } catch {
      throw new Error("ID kelompok on-chain tidak valid. Pembayaran dibatalkan.");
    }
    if (targetGroupId <= 0n) {
      throw new Error("ID kelompok on-chain tidak valid. Pembayaran dibatalkan.");
    }

    const data = encodePayContributionCall(targetGroupId, params.cycleNumber);
    const txHash = await sendContractTransaction({
      to: targetContract,
      from: walletAddress,
      data,
      value: params.amountWei,
    });

    params.onSubmitted?.(txHash);
    const receipt = await waitForTransactionReceipt(txHash);

    return {
      txHash,
      mode: "contract",
      receipt,
    };
  }
}

export const paymentAdapter = new DefaultPaymentAdapter();

export async function payContribution(params: {
  cycleId: string;
  groupId: string;
  contractGroupId: string;
  contractAddress?: string;
  cycleNumber: number;
  amountWei: string;
  onSubmitted?: (txHash: string) => void;
}): Promise<{
  txHash: string;
  mode: "contract";
  receipt: WalletTransactionReceipt;
}> {
  return paymentAdapter.payContribution(params);
}
