// Cek ulang merit untuk user E2E (one-shot).
import { prisma } from '../src/lib/prisma'
import { recalcMerit, computeBreakdown } from '../src/lib/merit'

async function main() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: 'e2e_' } } })
  for (const u of users) {
    const b = await computeBreakdown(u.walletAddress)
    const r = await recalcMerit(u.walletAddress, 'adjustment')
    console.log(u.username, 'breakdown:', JSON.stringify(b), '-> score', r.newScore, 'tier', r.tier)
  }
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
