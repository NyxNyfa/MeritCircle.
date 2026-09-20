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

export class MockPaymentVerifier implements PaymentVerifier {
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

export let paymentVerifier: PaymentVerifier = new MockPaymentVerifier();

export function setPaymentVerifier(verifier: PaymentVerifier): void {
  paymentVerifier = verifier;
}
