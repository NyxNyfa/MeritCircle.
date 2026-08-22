// One-shot smoke test backend jobs (dipanggil manual, bukan bagian dari app).
// Pemakaian: DATABASE_URL=... npx tsx scripts/smoke-jobs.ts
import { readPoolState } from '../src/lib/chain'
import { runIndexerOnce } from '../src/lib/indexer'
import { runDefaultCheckOnce } from '../src/lib/default-check'
import { computeBreakdown, recalcMerit } from '../src/lib/merit'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('--- Smoke: baca state pool on-chain ---')
  for (let i = 0; i < 6; i++) {
    const s = await readPoolState(i)
    console.log(`pool ${i}: status=${s.status} round=${s.round} cycle=${Number(s.activeCycle)} members=${Number(s.memberCount)}`)
  }

  console.log('--- Smoke: indexer sekali jalan ---')
  console.log(await runIndexerOnce())

  console.log('--- Smoke: default-check sekali jalan ---')
  console.log(await runDefaultCheckOnce())

  console.log('--- Smoke: merit engine pada user pertama di DB ---')
  const anyUser = await prisma.user.findFirst()
  if (anyUser) {
    const breakdown = await computeBreakdown(anyUser.walletAddress)
    console.log(`@${anyUser.username}: breakdown`, breakdown)
    console.log(await recalcMerit(anyUser.walletAddress, 'adjustment'))
  }

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
