// Scheduler backend jobs (indexer, keeper, default-check) — interval sederhana.
// Aktif hanya saat ENABLE_BACKEND_JOBS=true agar dev build / static tidak memulai loop.
import { runIndexerOnce } from '@/lib/indexer'
import { runKeeperOnce } from '@/lib/keeper'
import { runDefaultCheckOnce } from '@/lib/default-check'

const INDEXER_INTERVAL_MS = 15_000
const KEEPER_INTERVAL_MS = 30_000
const DEFAULT_CHECK_INTERVAL_MS = 60_000

let started = false

export function startBackendJobs(): void {
  if (started) return
  started = true
  console.log('[jobs] backend jobs dimulai (indexer/keeper/default-check)')

  const loop = (name: string, ms: number, fn: () => Promise<unknown>) => {
    const tick = async () => {
      try {
        await fn()
      } catch (error) {
        console.error(`[jobs:${name}]`, error)
      }
    }
    // jalankan sekali segera lalu interval
    void tick()
    return setInterval(tick, ms)
  }

  loop('indexer', INDEXER_INTERVAL_MS, runIndexerOnce)

  if (process.env.KEEPER_PRIVATE_KEY) {
    loop('keeper', KEEPER_INTERVAL_MS, runKeeperOnce)
    console.log('[jobs] keeper aktif')
  } else {
    console.log('[jobs] keeper NONAKTIF — KEEPER_PRIVATE_KEY tidak diset')
  }

  loop('default-check', DEFAULT_CHECK_INTERVAL_MS, runDefaultCheckOnce)
}
