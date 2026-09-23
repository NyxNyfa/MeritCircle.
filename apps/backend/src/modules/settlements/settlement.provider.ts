import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { logger } from "../../utils/logger";

export interface SettleCycleParams {
  groupId: string;
  contractGroupId?: string;
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

const meritCircleAbi = parseAbi([
  "function settleBasicCycle(uint256 groupId, uint256 cycle, address recipient) external",
  "function settleAuctionCycle(uint256 groupId, uint256 cycle) external",
  "function settleFinalCycle(uint256 groupId, uint256 cycle, address recipient) external",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function getGroup(uint256 groupId) external view returns ((bool exists, uint256 poolId, uint256 currentCycle, bool completed, uint256 memberCount))",
]);

const RPC_URL =
  process.env.BNB_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL ||
  "https://bsc-testnet.bnbchain.org";

const CONTRACT_ADDRESS = (
  process.env.CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C"
) as `0x${string}`;

/**
 * Production On-Chain Settlement Provider.
 * Executes live smart contract settlements on BNB Smart Chain Testnet via settler private key.
 */
export class OnChainSettlementProvider implements SettlementProvider {
  private publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(RPC_URL),
  });

  async settleCycle(params: SettleCycleParams): Promise<SettlementResult> {
    const privateKey = (process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY) as `0x${string}` | undefined;
    if (!privateKey) {
      logger.error("[OnChainSettlementProvider] DEPLOYER_PRIVATE_KEY environment variable is not configured.");
      return {
        success: false,
        reason: "Kunci privat deployer (DEPLOYER_PRIVATE_KEY) tidak ditemukan untuk eksekusi penyelesaian on-chain.",
      };
    }

    try {
      const account = privateKeyToAccount(privateKey);
      const walletClient = createWalletClient({
        account,
        chain: bscTestnet,
        transport: http(RPC_URL),
      });

      const targetGroupId = params.contractGroupId
        ? BigInt(params.contractGroupId)
        : BigInt(params.groupId.replace(/[^0-9]/g, "") || "1");

      const cycleNumber = BigInt(params.cycleNumber);
      const recipientAddress = params.recipientWalletAddress as `0x${string}`;

      logger.info(
        `[OnChainSettlementProvider] Executing ${params.type} on-chain for groupId ${targetGroupId}, cycle ${cycleNumber}, recipient ${recipientAddress}...`
      );

      let txHash: `0x${string}`;

      if (params.type === "FINAL_CYCLE") {
        txHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: meritCircleAbi,
          functionName: "settleFinalCycle",
          args: [targetGroupId, cycleNumber, recipientAddress],
        });
      } else if (params.type === "AUCTION_CYCLE") {
        txHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: meritCircleAbi,
          functionName: "settleAuctionCycle",
          args: [targetGroupId, cycleNumber],
        });
      } else {
        // BASIC_CYCLE or FORCE_SETTLE
        txHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: meritCircleAbi,
          functionName: "settleBasicCycle",
          args: [targetGroupId, cycleNumber, recipientAddress],
        });
      }

      logger.info(`[OnChainSettlementProvider] Tx submitted: ${txHash}. Waiting for confirmation...`);

      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status === "reverted") {
        logger.error(`[OnChainSettlementProvider] Tx ${txHash} reverted on chain.`);
        return {
          success: false,
          txHash,
          reason: "Transaksi smart contract mengalami revert saat proses eksekusi distribusi dana di BNB Testnet.",
        };
      }

      logger.info(`[OnChainSettlementProvider] Tx confirmed in block ${receipt.blockNumber}. TxHash: ${receipt.transactionHash}`);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (err: any) {
      logger.error("[OnChainSettlementProvider] Failed to settle cycle on chain:", err);
      return {
        success: false,
        reason: `Penyelesaian on-chain gagal: ${err?.message || "Kesalahan jaringan smart contract"}`,
      };
    }
  }
}

export class TestSettlementProvider implements SettlementProvider {
  async settleCycle(params: SettleCycleParams): Promise<SettlementResult> {
    return {
      success: true,
      txHash: `0xsettle_${params.cycleId}_${Date.now()}`,
    };
  }
}

// In production, default strictly to real OnChainSettlementProvider
export let defaultSettlementProvider: SettlementProvider =
  process.env.NODE_ENV === "test"
    ? new TestSettlementProvider()
    : new OnChainSettlementProvider();

export function setSettlementProvider(provider: SettlementProvider): void {
  defaultSettlementProvider = provider;
}
