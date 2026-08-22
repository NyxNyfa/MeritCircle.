// Default-check cron — state machine §23 di sisi off-chain (testnet):
//   deadline tercapai & belum bayar  -> GRACE_PERIOD  (peringatan)
//   grace habis & belum bayar        -> DEFAULT       (catat MISSED + penalti merit)
// Catatan otoritatif tetap dari event DefaultRecorded kontrak saat settle;
// cron ini yang memberi peringatan dini dan menandai lokal lebih awal.
import { prisma } from '@/lib/prisma'
import { readPoolState } from '@/lib/chain'
import { recalcMerit } from '@/lib/merit'
import { notify, notifyOncePerWindow } from '@/lib/notifier'

const GRACE_MINUTES = Number(process.env.DEFAULT_GRACE_MINUTES ?? 10)

export type DefaultCheckResult = {
  warned: number
  defaulted: number
}

export async function runDefaultCheckOnce(): Promise<DefaultCheckResult> {
  const result = { warned: 0, defaulted: 0 }
  const nowSec = Math.floor(Date.now() / 1000)

  for (let poolIdOnChain = 0; poolIdOnChain <= 5; poolIdOnChain++) {
    let state: Awaited<ReturnType<typeof readPoolState>>
    try {
      state = await readPoolState(poolIdOnChain)
    } catch {
      continue // kontrak belum ter-deploy / RPC bermasalah
    }
    if (state.status !== 1) continue

    const deadline = Number(state.deadline)
    if (!deadline || nowSec <= deadline) continue

    const graceEndSec = deadline + GRACE_MINUTES * 60
    const round = Number(state.round)
    const cycle = Number(state.activeCycle)

    const dbPool = await prisma.pool.findUnique({
      where: { poolIdOnChain },
      include: { members: true },
    })
    if (!dbPool) continue

    for (const member of dbPool.members) {
      const wallet = member.userId
      const contribution = await prisma.contribution.findUnique({
        where: {
          poolIdOnChain_round_cycle_userWallet: {
            poolIdOnChain,
            round,
            cycle,
            userWallet: wallet,
          },
        },
      })

      // Sudah bayar atau sudah dicatat default — tidak ada aksi
      if (contribution && contribution.status === 'PAID') continue
      if (contribution && contribution.status === 'MISSED') continue

      if (nowSec < graceEndSec) {
        // Fase GRACE_PERIOD — peringatan sekali saja
        const created = await notifyOncePerWindow(
          wallet,
          'default_warning',
          'Iuran belum dibayar',
          `Cycle ${cycle} ${dbPool.name} melewati deadline. Bayar dalam ${GRACE_MINUTES} menit untuk menghindari default.`,
          Math.max(60_000, GRACE_MINUTES * 60 * 1000),
        )
        if (created) result.warned++
        continue
      }

      // Grace habis -> catat default lokal (kontrak akan merekam ulang secara otoritatif saat settle)
      await prisma.contribution.upsert({
        where: {
          poolIdOnChain_round_cycle_userWallet: {
            poolIdOnChain,
            round,
            cycle,
            userWallet: wallet,
          },
        },
        update: { status: 'MISSED', paidAt: null },
        create: {
          poolIdOnChain,
          round,
          cycle,
          userWallet: wallet,
          amount: dbPool.contributionAmount,
          status: 'MISSED',
        },
      })

      const missed = await prisma.contribution.count({
        where: { poolIdOnChain, round, userWallet: wallet, status: 'MISSED' },
      })
      await prisma.obligation.updateMany({
        where: { poolIdOnChain, round, userWallet: wallet },
        data: { missedCycles: missed },
      })

      await notify(
        wallet,
        'default_recorded',
        'Default tercatat',
        `Kontribusi cycle ${cycle}${dbPool ? ` di ${dbPool.name}` : ''} ditandai default. Selesaikan sisa kewajiban untuk memulihkan merit.`,
      )
      await recalcMerit(wallet, 'default')
      result.defaulted++
    }
  }

  return result
}
