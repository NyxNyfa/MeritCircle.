import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 1 Tier = 20 Merit Points (Score 0-19 = Tier 0, 20-39 = Tier 1, dst.)
const MERIT_POINTS_PER_TIER = 20

async function main() {
  console.log('🌱 Memulai proses seeding database...')

  // 1. Data user test dengan Tier berbeda (1 Tier = 20 Merit Points)
  const users = [
    {
      walletAddress: '0x59250f719772EE841a1a5eC6AC4B1e32ec3F1d7F',
      username: 'novice_arisan',
      meritScore: 5, // Tier 0
      isVerified: false,
    },
    {
      walletAddress: '0xB4a86B0C67b9676F7805720d0F2b12B12F598cbF',
      username: 'savvy_saver',
      meritScore: 25, // Tier 1
      isVerified: false,
    },
    {
      walletAddress: '0xad4190970D0247F67A97186789f4D7c7dB3785B1',
      username: 'silver_roamer',
      meritScore: 45, // Tier 2
      isVerified: false,
    },
    {
      walletAddress: '0xB58B93698f09e3eFde98230d63b694b5bDE1246e',
      username: 'gold_member',
      meritScore: 85, // Tier 4 — memenuhi syarat Elite Auction Pool
      isVerified: true, // VIP
    },
    {
      walletAddress: '0x26dc1a85f5f2C58Ec434b741aE3d9CA891D25806',
      username: 'elite_legend',
      meritScore: 110, // Tier 5
      isVerified: true, // VIP
    },
  ]

  for (const u of users) {
    const tier = Math.floor(u.meritScore / MERIT_POINTS_PER_TIER)
    await prisma.user.upsert({
      where: { walletAddress: u.walletAddress },
      update: {
        username: u.username,
        meritScore: u.meritScore,
        tier,
        isVerified: u.isVerified,
      },
      create: {
        walletAddress: u.walletAddress,
        username: u.username,
        meritScore: u.meritScore,
        tier,
        isVerified: u.isVerified,
      },
    })
  }

  // 2. Data Pool (Arisan) — SINKRON dengan konstruktor MeritPool.sol (pools[0..5])
  const pools = [
    { poolIdOnChain: 0, name: 'Basic Pool', poolSize: 3, contributionAmount: 50, tierRequired: 0, totalYield: 150, isAuctionMode: false },
    { poolIdOnChain: 1, name: 'Standard Pool', poolSize: 5, contributionAmount: 100, tierRequired: 1, totalYield: 500, isAuctionMode: false },
    { poolIdOnChain: 2, name: 'Premium Pool', poolSize: 5, contributionAmount: 200, tierRequired: 2, totalYield: 1000, isAuctionMode: false },
    { poolIdOnChain: 3, name: 'Grand Pool', poolSize: 10, contributionAmount: 100, tierRequired: 3, totalYield: 1000, isAuctionMode: false },
    { poolIdOnChain: 4, name: 'Elite Auction Pool', poolSize: 5, contributionAmount: 100, tierRequired: 4, totalYield: 500, isAuctionMode: true },
    { poolIdOnChain: 5, name: 'VIP Auction Pool', poolSize: 5, contributionAmount: 500, tierRequired: 5, totalYield: 2500, isAuctionMode: true },
  ]

  for (const p of pools) {
    await prisma.pool.upsert({
      where: { poolIdOnChain: p.poolIdOnChain },
      update: p,
      create: p,
    })
  }
  console.log(`✅ ${pools.length} Pools tersinkron (upsert) dengan registri smart contract.`)

  console.log('✅ Seeding selesai secara keseluruhan!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })