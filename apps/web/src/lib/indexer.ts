// Indexer MeritPool v2 — polling event on-chain ke database.
// Idempotent: semua tulisan memakai upsert pada unique key sehingga replay blok aman.
import { prisma } from '@/lib/prisma'
import {
  getPublicClient,
  getMeritPoolAddress,
} from '@/lib/chain'
import { recalcMerit, recalcMeritMany } from '@/lib/merit'
import { notify } from '@/lib/notifier'

const CURSOR_ID = 'meritpool-events'
const MAX_BLOCKS_PER_RUN = 3000

const MERITPOOL_EVENTS_ABI = [
  {
    type: 'event',
    name: 'PoolJoined',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'round', type: 'uint256', indexed: true },
      { name: 'cycle', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ContributionPaid',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'round', type: 'uint256', indexed: true },
      { name: 'cycle', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BidPlaced',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'round', type: 'uint256', indexed: true },
      { name: 'cycle', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CycleSettled',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'round', type: 'uint256', indexed: true },
      { name: 'cycle', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: false },
      { name: 'payout', type: 'uint256', indexed: false },
      { name: 'surplus', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DefaultRecorded',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'round', type: 'uint256', indexed: true },
      { name: 'cycle', type: 'uint256', indexed: true },
      { name: 'member', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PoolCompleted',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'round', type: 'uint256', indexed: true },
    ],
  },
] as const

type DecodedArgs = Record<string, unknown>

type SimpleLog = {
  args?: DecodedArgs
  blockNumber?: bigint | number
  logIndex?: number
  transactionHash?: string | null
}

async function fetchEvent(eventName: string, fromBlock: bigint, toBlock: bigint): Promise<SimpleLog[]> {
  const client = getPublicClient()
  const eventAbi = MERITPOOL_EVENTS_ABI.find((e) => e.name === eventName)
  if (!eventAbi) return []
  try {
    const logs = await client.getLogs({
      address: getMeritPoolAddress(),
      event: eventAbi as never,
      fromBlock,
      toBlock,
    } as never)
    return logs as unknown as SimpleLog[]
  } catch {
    return []
  }
}

function weiToNumber(wei: unknown): number {
  try {
    return Number(BigInt(wei as bigint)) / 1e18
  } catch {
    return 0
  }
}

async function getDbPool(poolIdOnChain: number) {
  return prisma.pool.findUnique({ where: { poolIdOnChain } })
}

async function ensureObligation(
  poolIdOnChain: number,
  round: number,
  wallet: string,
  totalCycles: number,
) {
  await prisma.obligation.upsert({
    where: {
      poolIdOnChain_round_userWallet: { poolIdOnChain, round, userWallet: wallet },
    },
    update: {},
    create: { poolIdOnChain, round, userWallet: wallet, totalCycles },
  })
}

async function handlePoolJoined(args: DecodedArgs, txHash: string | null) {
  const poolIdOnChain = Number(args.poolId)
  const round = Number(args.round)
  const cycle = Number(args.cycle)
  const user = String(args.user).toLowerCase()

  const dbPool = await getDbPool(poolIdOnChain)
  if (!dbPool) return

  // Mirror keanggotaan off-chain (dipakai Merit Queue & notifikasi)
  await prisma.poolMember.upsert({
    where: { userId_poolId: { userId: user, poolId: dbPool.id } },
    update: {},
    create: { userId: user, poolId: dbPool.id },
  })

  await ensureObligation(poolIdOnChain, round, user, dbPool.poolSize)

  // Join = kontribusi cycle 1
  if (cycle === 1) {
    await prisma.contribution.upsert({
      where: {
        poolIdOnChain_round_cycle_userWallet: {
          poolIdOnChain,
          round,
          cycle,
          userWallet: user,
        },
      },
      update: { status: 'PAID', paidAt: new Date(), txHash },
      create: {
        poolIdOnChain,
        round,
        cycle,
        userWallet: user,
        amount: dbPool.contributionAmount,
        paidAt: new Date(),
        status: 'PAID',
        txHash,
      },
    })
  }

  await notify(user, 'contribution_due', `Berhasil masuk ${dbPool.name}`, 'Kontribusi cycle pertama diterima. Selesaikan seluruh siklus untuk membangun merit.')
  await recalcMerit(user, 'adjustment')
}

async function handleContributionPaid(args: DecodedArgs, txHash: string | null) {
  const poolIdOnChain = Number(args.poolId)
  const round = Number(args.round)
  const cycle = Number(args.cycle)
  const user = String(args.user).toLowerCase()
  const amount = weiToNumber(args.amount)

  await prisma.contribution.upsert({
    where: {
      poolIdOnChain_round_cycle_userWallet: { poolIdOnChain, round, cycle, userWallet: user },
    },
    update: { status: 'PAID', paidAt: new Date(), txHash, amount },
    create: {
      poolIdOnChain,
      round,
      cycle,
      userWallet: user,
      amount,
      paidAt: new Date(),
      status: 'PAID',
      txHash,
    },
  })

  const contributed = await prisma.contribution.count({
    where: { poolIdOnChain, round, userWallet: user, status: { in: ['PAID', 'LATE'] } },
  })
  await prisma.obligation.updateMany({
    where: { poolIdOnChain, round, userWallet: user },
    data: { contributedCycles: contributed },
  })

  await notify(user, 'payment_success', 'Iuran diterima', `Kontribusi cycle ${cycle} (${amount} MC) tercatat on-chain.`)
  await recalcMerit(user, 'adjustment')
}

async function handleBidPlaced(args: DecodedArgs, txHash: string | null) {
  const poolIdOnChain = Number(args.poolId)
  const round = Number(args.round)
  const cycle = Number(args.cycle)
  const bidder = String(args.bidder).toLowerCase()
  const amount = weiToNumber(args.amount)

  const auction = await prisma.auction.upsert({
    where: { poolIdOnChain_round_cycle: { poolIdOnChain, round, cycle } },
    update: {},
    create: {
      poolIdOnChain,
      round,
      cycle,
      opensAt: new Date(),
      closesAt: new Date(Date.now() + 60 * 60 * 1000), // placeholder; diperbarui saat CLOSED
    },
  })

  await prisma.bid.upsert({
    where: { auctionId_userWallet: { auctionId: auction.id, userWallet: bidder } },
    update: { amount, valid: true, txHash },
    create: { auctionId: auction.id, userWallet: bidder, amount, valid: true, txHash },
  })

  await notify(bidder, 'auction_open', 'Bid tercatat', `Bid ${amount} MC masuk dalam lelang cycle ${cycle}.`)
}

async function handleCycleSettled(args: DecodedArgs, txHash: string | null) {
  const poolIdOnChain = Number(args.poolId)
  const round = Number(args.round)
  const cycle = Number(args.cycle)
  const winner = String(args.winner).toLowerCase()
  const payout = weiToNumber(args.payout)
  const surplus = weiToNumber(args.surplus)

  const dbPool = await getDbPool(poolIdOnChain)
  const nominal = dbPool?.totalYield ?? payout
  const discount = Math.max(0, nominal - payout)

  await prisma.payout.upsert({
    where: { poolIdOnChain_round_cycle: { poolIdOnChain, round, cycle } },
    update: { payoutAmount: payout, discount, surplus, userWallet: winner, txHash },
    create: {
      poolIdOnChain,
      round,
      cycle,
      userWallet: winner,
      nominalAmount: nominal,
      payoutAmount: payout,
      discount,
      surplus,
      txHash,
    },
  })

  if (dbPool?.isAuctionMode) {
    const auction = await prisma.auction.findUnique({
      where: { poolIdOnChain_round_cycle: { poolIdOnChain, round, cycle } },
    })
    if (auction && auction.status !== 'CLOSED') {
      await prisma.auction.update({
        where: { id: auction.id },
        data: {
          status: 'CLOSED',
          closesAt: new Date(),
          winningBid: payout,
          winnerWallet: winner,
          surplus,
        },
      })
    }
  }

  // Simpan pemenang di kartu pool (username bila terdaftar)
  if (dbPool) {
    const winnerUser = await prisma.user.findUnique({ where: { walletAddress: winner } })
    await prisma.pool.update({
      where: { id: dbPool.id },
      data: {
        lastWinnerAddress: winner,
        lastWinnerUsername: winnerUser?.username ?? null,
      },
    })
  }

  // Notifikasi pemenang + anggota lain
  await notify(winner, 'payout', 'Selamat — Anda menerima payout!', `${payout.toLocaleString()} MC dikirim on-chain.`)
  if (dbPool?.isAuctionMode && discount > 0) {
    await notify(winner, 'auction_result', 'Lelang dimenangkan', `Payout ${payout.toLocaleString()} MC (diskon ${(discount / nominal * 100).toFixed(1)}%).`)
  }

  await recalcMerit(winner, 'payout_received')
}

async function handleDefaultRecorded(args: DecodedArgs) {
  const poolIdOnChain = Number(args.poolId)
  const round = Number(args.round)
  const cycle = Number(args.cycle)
  const member = String(args.member).toLowerCase()

  const result = await prisma.contribution.upsert({
    where: {
      poolIdOnChain_round_cycle_userWallet: { poolIdOnChain, round, cycle, userWallet: member },
    },
    update: { status: 'MISSED', paidAt: null },
    create: {
      poolIdOnChain,
      round,
      cycle,
      userWallet: member,
      amount: 0,
      status: 'MISSED',
    },
  })

  const missed = await prisma.contribution.count({
    where: { poolIdOnChain, round, userWallet: member, status: 'MISSED' },
  })
  await prisma.obligation.updateMany({
    where: { poolIdOnChain, round, userWallet: member },
    data: { missedCycles: missed },
  })

  const dbPool = await getDbPool(poolIdOnChain)
  if (result.status === 'MISSED') {
    await notify(member, 'default_recorded', 'Contribution terlewat', `Cycle ${cycle}${dbPool ? ` di ${dbPool.name}` : ''} dicatat sebagai default. Merit Anda terpengaruh — selesaikan sisa kewajiban untuk pulih.`)
    await recalcMerit(member, 'default')
  }
}

async function handlePoolCompleted(args: DecodedArgs) {
  const poolIdOnChain = Number(args.poolId)
  const round = Number(args.round)

  const members = await prisma.obligation.findMany({
    where: { poolIdOnChain, round },
    select: { userWallet: true },
  })
  await prisma.obligation.updateMany({
    where: { poolIdOnChain, round },
    data: { status: 'COMPLETED' },
  })

  const dbPool = await getDbPool(poolIdOnChain)
  const wallets = members.map((m) => m.userWallet)
  for (const wallet of wallets) {
    await notify(wallet, 'pool_completed', 'Pool selesai', `${dbPool?.name ?? 'Pool'} ronde ini tuntas. Merit Anda naik — tier lebih tinggi menanti.`)
  }
  await recalcMeritMany(wallets, 'pool_completed')
}

/**
 * Jalankan satu putaran indexer. Return jumlah blok baru yang diproses.
 */
export async function runIndexerOnce(): Promise<{ processedBlocks: number; events: number }> {
  const client = getPublicClient()
  const latest = Number(await client.getBlockNumber())

  const cursor = await prisma.indexerCursor.findUnique({ where: { id: CURSOR_ID } })
  let fromBlock: number
  if (!cursor) {
    // Pertama kali: mulai dari jendela terbaru saja (riwayat lama tidak wajib untuk MVP)
    fromBlock = Math.max(0, latest - 4000)
  } else {
    fromBlock = cursor.lastBlock + 1
  }

  if (fromBlock > latest) return { processedBlocks: 0, events: 0 }
  const toBlock = Math.min(latest, fromBlock + MAX_BLOCKS_PER_RUN)

  let events = 0

  const jobs: Array<[string, (args: DecodedArgs, txHash: string | null) => Promise<void>]> = [
    ['PoolJoined', handlePoolJoined],
    ['ContributionPaid', handleContributionPaid],
    ['BidPlaced', handleBidPlaced],
    ['CycleSettled', handleCycleSettled],
    ['DefaultRecorded', async (args) => handleDefaultRecorded(args)],
    ['PoolCompleted', async (args) => handlePoolCompleted(args)],
  ]

  // Gabungkan semua log lalu urutkan per blok/logIndex agar urutan pemrosesan deterministik
  const allLogs: Array<{ log: SimpleLog; handler: (args: DecodedArgs, txHash: string | null) => Promise<void>; eventName: string }> = []
  for (const [eventName, handler] of jobs) {
    try {
      const logs = await fetchEvent(eventName, BigInt(fromBlock), BigInt(toBlock))
      for (const log of logs) {
        allLogs.push({ log, handler, eventName })
      }
    } catch (error) {
      console.error(`[indexer] gagal mengambil ${eventName}:`, error)
    }
  }

  allLogs.sort((a, b) => {
    const bn = Number(a.log.blockNumber ?? 0) - Number(b.log.blockNumber ?? 0)
    return bn !== 0 ? bn : Number(a.log.logIndex ?? 0) - Number(b.log.logIndex ?? 0)
  })

  for (const item of allLogs) {
    try {
      const args = item.log.args ?? {}
      await item.handler(args, item.log.transactionHash ?? null)
      events++
    } catch (error) {
      console.error(`[indexer] gagal proses ${item.eventName} @${item.log.blockNumber}:`, error)
    }
  }

  await prisma.indexerCursor.upsert({
    where: { id: CURSOR_ID },
    update: { lastBlock: toBlock },
    create: { id: CURSOR_ID, lastBlock: toBlock },
  })

  return { processedBlocks: toBlock - fromBlock + 1, events }
}
