// One-off repair: whitelist wallets yang pernah dibuat sebagai user normal (Tier 0)
// akibat bug case-sensitivity lama → dipaksa jadi QA_Tester, meritScore 100 (Tier 5).
// Jalankan: npx tsx prisma/fix-whitelist.ts
import { PrismaClient } from '@prisma/client'
import { QA_WHITELIST, qaUsernameFor } from '../src/config/whitelist'

const prisma = new PrismaClient()

const MERIT_POINTS_PER_TIER = 20

async function main() {
  let updated = 0
  for (const address of QA_WHITELIST) {
    const user = await prisma.user.upsert({
      where: { walletAddress: address },
      update: {
        username: qaUsernameFor(address),
        meritScore: 100,
        tier: Math.floor(100 / MERIT_POINTS_PER_TIER),
        isVerified: true,
      },
      create: {
        walletAddress: address,
        username: qaUsernameFor(address),
        meritScore: 100,
        tier: Math.floor(100 / MERIT_POINTS_PER_TIER),
        isVerified: true,
      },
    })
    console.log(`✅ ${address} → ${user.username} · meritScore ${user.meritScore} · tier ${user.tier}`)
    updated++
  }
  console.log(`Selesai: ${updated} wallet whitelist tersinkron.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())