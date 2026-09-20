export interface SettleCycleParams {
  groupId: string;
  cycleId: string;
  cycleNumber: number;
  recipientUserId: string;
  recipientWalletAddress: string;
  amountWei: string;
  type: "BASIC_CYCLE" | "AUCTION_CYCLE" | "FINAL_CYCLE" | "FORCE_SETTLE";
}

export interface SettlementResult {
  success: boolean;
  txHash?: string;
  reason?: string;
}

export interface SettlementProvider {
  settleCycle(params: SettleCycleParams): Promise<SettlementResult>;
}

export class MockSettlementProvider implements SettlementProvider {
  async settleCycle(params: SettleCycleParams): Promise<SettlementResult> {
    return {
      success: true,
      txHash: `mock-settlement-${params.cycleId}`,
    };
  }
}

export const defaultSettlementProvider: SettlementProvider =
  new MockSettlementProvider();
