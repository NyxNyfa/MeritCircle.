// Helper on-chain untuk sisi server (API routes) — membaca state MeritPool v2.
import { createPublicClient, http, type PublicClient } from 'viem'
import { bscTestnet, foundry } from 'viem/chains'
import { getContractAddresses, MERITPOOL_ABI } from '@/config/contracts'

export function getServerChainId(): number {
  return Number(process.env.CHAIN_ID ?? 31337)
}

function viemChainFor(chainId: number) {
  if (chainId === 97) return bscTestnet
  return foundry
}

let cachedClient: PublicClient | null = null

export function getPublicClient(): PublicClient {
  if (!cachedClient) {
    const chainId = getServerChainId()
    cachedClient = createPublicClient({
      chain: viemChainFor(chainId),
      transport: http(process.env.RPC_URL ?? (chainId === 97 ? 'https://bsc-testnet-dataseed.bnbchain.org' : 'http://127.0.0.1:8545')),
    })
  }
  return cachedClient
}

export function getMeritPoolAddress(): `0x${string}` {
  return getContractAddresses(getServerChainId()).meritPool
}

export type OnChainPoolState = {
  status: number
  round: bigint
  activeCycle: bigint
  deadline: bigint
  collected: bigint
  memberCount: bigint
}

export async function readPoolState(poolIdOnChain: number): Promise<OnChainPoolState> {
  const client = getPublicClient()
  const [status, round, activeCycle, deadline, collected, memberCount] = await client.readContract({
    address: getMeritPoolAddress(),
    abi: MERITPOOL_ABI,
    functionName: 'getPoolState',
    args: [BigInt(poolIdOnChain)],
  })
  return { status: Number(status), round, activeCycle, deadline, collected, memberCount }
}

export async function readHasWon(poolIdOnChain: number, account: string): Promise<boolean> {
  // hasWon[poolId][account]
  const client = getPublicClient()
  return client.readContract({
    address: getMeritPoolAddress(),
    abi: [
      {
        type: 'function',
        name: 'hasWon',
        inputs: [
          { name: '', type: 'uint256' },
          { name: '', type: 'address' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
      },
    ] as const,
    functionName: 'hasWon',
    args: [BigInt(poolIdOnChain), account as `0x${string}`],
  })
}

export async function readIsSettleable(poolIdOnChain: number): Promise<boolean> {
  const client = getPublicClient()
  const result = await client.readContract({
    address: getMeritPoolAddress(),
    abi: MERITPOOL_ABI,
    functionName: 'isSettleable',
    args: [BigInt(poolIdOnChain)],
  } as never)
  return Boolean(result)
}

/** Baca konfigurasi pool on-chain. */
export async function readPoolConfig(poolIdOnChain: number): Promise<{
  poolId: number
  name: string
  tierRequired: number
  contributionAmount: number
  maxMembers: number
  totalCycles: number
  cycleDurationSec: number
  isAuctionMode: boolean
  maxDiscountBps: number
}> {
  const client = getPublicClient()
  const raw = (await client.readContract({
    address: getMeritPoolAddress(),
    abi: MERITPOOL_ABI,
    functionName: 'pools',
    args: [BigInt(poolIdOnChain)],
  } as never)) as readonly unknown[]
  return {
    poolId: Number(raw[0]),
    name: String(raw[1]),
    tierRequired: Number(raw[2]),
    contributionAmount: Number(raw[3]) / 1e18,
    maxMembers: Number(raw[4]),
    totalCycles: Number(raw[5]),
    cycleDurationSec: Number(raw[6]),
    isAuctionMode: Boolean(raw[7]),
    maxDiscountBps: Number(raw[8]),
  }
}

export async function readHasContributed(
  poolIdOnChain: number,
  cycle: bigint,
  account: string,
): Promise<boolean> {
  const client = getPublicClient()
  return client.readContract({
    address: getMeritPoolAddress(),
    abi: MERITPOOL_ABI,
    functionName: 'hasContributed',
    args: [BigInt(poolIdOnChain), cycle, account as `0x${string}`],
  })
}
