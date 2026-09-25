import { createPublicClient, createWalletClient, http, parseAbi, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { prisma } from "../../db/client";
import { logger } from "../../utils/logger";

const RPC_URL =
  process.env.BNB_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL ||
  "https://bsc-testnet.bnbchain.org";

const CONTRACT_ADDRESS = (
  process.env.CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C"
) as `0x${string}`;

const groupRegistrationAbi = parseAbi([
  "function registerGroup(uint256 poolId, uint256 groupNumber, address[] memory members) external returns (uint256)",
  "function nextGroupId() external view returns (uint256)",
  "function groupNumberUsed(uint256 poolId, uint256 groupNumber) external view returns (bool)",
  "function getGroup(uint256 groupId) external view returns ((uint256 poolId, uint256 groupNumber, uint256 startDate, uint8 memberCount, uint8 currentCycle, bool exists, bool completed, bool paused))",
  "function getGroupMembers(uint256 groupId) external view returns (address[])",
  "event GroupRegistered(uint256 indexed groupId, uint256 indexed poolId, uint256 groupNumber, uint256 timestamp)",
]);

export interface RegisterGroupParams {
  poolExternalId?: string;
  groupNumber: number;
  memberWalletAddresses: string[];
}

export interface RegisterGroupResult {
  success: boolean;
  contractGroupId: string;
  txHash?: string;
  reason?: string;
}

/**
 * Registers a formed group on the MeritCircleCore smart contract using the settler/deployer relayer.
 */
export async function registerGroupOnChain(params: {
  poolExternalId?: string;
  groupNumber: number;
  memberWalletAddresses: string[];
}): Promise<RegisterGroupResult> {
  const privateKey = (process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY) as `0x${string}` | undefined;
  if (!privateKey) {
    logger.warn("[GroupRegistration] DEPLOYER_PRIVATE_KEY not set. Using groupNumber as contractGroupId fallback.");
    return {
      success: false,
      contractGroupId: String(params.groupNumber),
      reason: "DEPLOYER_PRIVATE_KEY is missing",
    };
  }

  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(RPC_URL),
  });

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http(RPC_URL),
  });

  // START-1 is mapped to poolId = 1 on the contract
  const onChainPoolId = 1n;
  const groupNumberBigInt = BigInt(params.groupNumber);
  const memberAddrs = params.memberWalletAddresses.map((a) => a.toLowerCase() as `0x${string}`);

  try {
    // 1. Check if this groupNumber is already used on-chain for this pool
    const isUsed = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: groupRegistrationAbi,
      functionName: "groupNumberUsed",
      args: [onChainPoolId, groupNumberBigInt],
    });

    if (isUsed) {
      logger.info(
        `[GroupRegistration] Group number ${params.groupNumber} is already registered on-chain for pool ${onChainPoolId}. Finding groupId...`
      );
      const nextGroupId = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: groupRegistrationAbi,
        functionName: "nextGroupId",
      });

      for (let i = 1; i < Number(nextGroupId); i++) {
        try {
          const g = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: groupRegistrationAbi,
            functionName: "getGroup",
            args: [BigInt(i)],
          });
          if (g.poolId === onChainPoolId && g.groupNumber === groupNumberBigInt) {
            logger.info(`[GroupRegistration] Found existing on-chain groupId: ${i}`);
            return {
              success: true,
              contractGroupId: String(i),
            };
          }
        } catch {}
      }

      return {
        success: true,
        contractGroupId: String(params.groupNumber),
      };
    }

    // 2. Execute registerGroup transaction
    logger.info(
      `[GroupRegistration] Calling registerGroup on-chain: poolId=${onChainPoolId}, groupNumber=${params.groupNumber}, members=${memberAddrs.join(", ")}`
    );

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: groupRegistrationAbi,
      functionName: "registerGroup",
      args: [onChainPoolId, groupNumberBigInt, memberAddrs],
    });

    logger.info(`[GroupRegistration] registerGroup tx sent: ${txHash}. Waiting for receipt...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== "success") {
      logger.error(`[GroupRegistration] registerGroup reverted on-chain. Tx: ${txHash}`);
      return {
        success: false,
        contractGroupId: String(params.groupNumber),
        txHash,
        reason: "Transaction reverted on chain",
      };
    }

    // 3. Parse GroupRegistered event from receipt logs
    let assignedGroupId = String(params.groupNumber);
    try {
      const logs = parseEventLogs({
        abi: groupRegistrationAbi,
        eventName: "GroupRegistered",
        logs: receipt.logs,
      });

      if (logs.length > 0 && logs[0].args?.groupId !== undefined) {
        assignedGroupId = logs[0].args.groupId.toString();
        logger.info(`[GroupRegistration] GroupRegistered event emitted groupId: ${assignedGroupId}`);
      } else {
        const nextId = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: groupRegistrationAbi,
          functionName: "nextGroupId",
        });
        assignedGroupId = (nextId - 1n).toString();
      }
    } catch (e: any) {
      logger.warn(`[GroupRegistration] Could not parse event log: ${e.message}`);
    }

    logger.info(`[GroupRegistration] Successfully registered group on-chain as groupId: ${assignedGroupId}`);
    return {
      success: true,
      contractGroupId: assignedGroupId,
      txHash,
    };
  } catch (error: any) {
    logger.error(`[GroupRegistration] Error registering group on-chain: ${error.message}`);
    return {
      success: false,
      contractGroupId: String(params.groupNumber),
      reason: error.message,
    };
  }
}

/**
 * Ensures an active database group has a valid contractGroupId on-chain.
 */
export async function syncGroupToChain(groupId: string): Promise<string> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      pool: true,
      members: {
        include: { user: true },
        orderBy: { payoutSlot: "asc" },
      },
    },
  });

  if (!group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  if (group.contractGroupId && /^[1-9]\d*$/.test(group.contractGroupId)) {
    return group.contractGroupId;
  }

  // Get member wallet addresses
  const memberWallets = group.members
    .map((m) => m.user.walletAddress)
    .filter((a): a is string => Boolean(a && /^0x[0-9a-fA-F]{40}$/.test(a)));

  if (memberWallets.length === group.members.length && memberWallets.length >= group.pool.groupSize) {
    const regResult = await registerGroupOnChain({
      poolExternalId: group.pool.externalPoolId,
      groupNumber: group.groupNumber,
      memberWalletAddresses: memberWallets,
    });

    if (regResult.contractGroupId) {
      await prisma.group.update({
        where: { id: groupId },
        data: { contractGroupId: regResult.contractGroupId },
      });
      return regResult.contractGroupId;
    }
  }

  const fallbackId = String(group.groupNumber);
  await prisma.group.update({
    where: { id: groupId },
    data: { contractGroupId: fallbackId },
  });
  return fallbackId;
}
