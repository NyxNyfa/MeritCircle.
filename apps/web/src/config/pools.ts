// Registry 6 Pool — SINKRON dengan konstruktor MeritPool.sol (pools[0..5])
// Nama sesuai spesifikasi §77: Basic/Standard/Growth/Trusted/Elite/Prime
export type PoolConfig = {
  poolIdOnChain: number
  name: string
  tierRequired: number
  contributionAmount: number // MC
  poolSize: number
  totalYield: number
  isAuctionMode: boolean
}

export const POOL_REGISTRY: PoolConfig[] = [
  { poolIdOnChain: 0, name: 'Basic Pool', tierRequired: 0, contributionAmount: 50, poolSize: 3, totalYield: 150, isAuctionMode: false },
  { poolIdOnChain: 1, name: 'Standard Pool', tierRequired: 1, contributionAmount: 100, poolSize: 5, totalYield: 500, isAuctionMode: false },
  { poolIdOnChain: 2, name: 'Growth Pool', tierRequired: 2, contributionAmount: 200, poolSize: 5, totalYield: 1000, isAuctionMode: false },
  { poolIdOnChain: 3, name: 'Trusted Pool', tierRequired: 3, contributionAmount: 100, poolSize: 10, totalYield: 1000, isAuctionMode: false },
  { poolIdOnChain: 4, name: 'Elite Pool', tierRequired: 4, contributionAmount: 100, poolSize: 5, totalYield: 500, isAuctionMode: true },
  { poolIdOnChain: 5, name: 'Prime Pool', tierRequired: 5, contributionAmount: 500, poolSize: 5, totalYield: 2500, isAuctionMode: true },
]

export const deployedPoolIdOnChain = 0
