'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { parseUnits } from 'viem'
import { cn } from '@/lib/utils'
import { MERITPOOL_ABI } from '@/config/contracts'
import { useContractAddresses } from '@/lib/use-contracts'
import { calculateTier } from '@/lib/tier'
import TierBadge from '@/components/TierBadge'
import { useToast } from '@/components/Toast'

type DetailData = {
  pool: {
    id: string
    poolIdOnChain: number
    name: string
    tierRequired: number
    contributionAmount: number
    poolSize: number
    totalYield: number
    isAuctionMode: boolean
    lastWinnerUsername: string | null
  }
  members: Array<{ wallet: string; username: string; meritScore: number; tier: number; joinedAt: string }>
  payoutsHistory: Array<{
    round: number
    cycle: number
    winnerWallet: string
    winnerUsername: string | null
    payoutAmount: number
    nominalAmount: number
    discount: number
    surplus: number
    createdAt: string
  }>
  auction: {
    status: string
    winningBid: number | null
    winnerWallet: string | null
    surplus: number | null
    bids: Array<{ userWallet: string; username: string | null; amount: number; createdAt: string }>
  } | null
}

type ReadResult<T = unknown> = { result?: T; error?: Error }
const resultOf = <T,>(r: unknown): T | undefined => (r as ReadResult<T> | undefined)?.result

const ZERO = '0x0000000000000000000000000000000000000000' as const

export default function PoolDetailPage() {
  const params = useParams<{ id: string }>()
  const idOnChain = Number(params?.id ?? NaN)
  const { address } = useAccount()
  const { toast } = useToast()
  const { meritPool: MERITPOOL_ADDRESS } = useContractAddresses()
  const { writeContractAsync, isPending: isWritePending } = useWriteContract()

  const [bidInput, setBidInput] = useState('')
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null)
  // Detik "sekarang" via external store (tick 15 dtk) — murni saat render
  const nowTs = useSyncExternalStore(
    (cb) => {
      const t = setInterval(cb, 15_000)
      return () => clearInterval(t)
    },
    () => Math.floor(Date.now() / 1000),
    () => 0,
  )

  useEffect(() => {
    if (!Number.isInteger(idOnChain)) return
    // Metrik engagement §65 — fire and forget, sekali per kunjungan halaman
    fetch(`/api/pools/${idOnChain}/view`, { method: 'POST' }).catch(() => undefined)
  }, [idOnChain])

  // ---- Data DB ----
  const { data: detail, isLoading: isDetailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ['pool-detail', idOnChain],
    queryFn: async (): Promise<DetailData> => {
      const res = await fetch(`/api/pools/${idOnChain}/detail`)
      if (!res.ok) throw new Error('Gagal memuat detail pool')
      return res.json()
    },
    enabled: Number.isInteger(idOnChain),
    refetchInterval: 30_000,
  })

  // ---- Data on-chain ----
  const states = useReadContracts({
    contracts: [
      { address: MERITPOOL_ADDRESS as `0x${string}`, abi: MERITPOOL_ABI, functionName: 'getPoolState', args: [BigInt(idOnChain)] },
    ],
    query: { enabled: Number.isInteger(idOnChain) },
  })
  type StateTuple = [number, bigint, bigint, bigint, bigint, bigint]
  const state = (() => {
    const r = resultOf<StateTuple>(states.data?.[0])
    if (!r) return undefined
    return { status: Number(r[0]), round: Number(r[1]), cycle: Number(r[2]), deadline: Number(r[3]), collected: Number(r[4]) / 1e18, memberCount: Number(r[5]) }
  })()

  const settleableQ = useReadContract({
    address: MERITPOOL_ADDRESS as `0x${string}`,
    abi: MERITPOOL_ABI,
    functionName: 'isSettleable',
    args: [BigInt(idOnChain)],
    query: { enabled: Number.isInteger(idOnChain), refetchInterval: 15_000 },
  })
  const settleable = resultOf<boolean>(settleableQ.data) === true

  const minBidQ = useReadContract({
    address: MERITPOOL_ADDRESS as `0x${string}`,
    abi: MERITPOOL_ABI,
    functionName: 'minValidBid',
    args: [BigInt(idOnChain)],
    query: { enabled: !!detail?.pool.isAuctionMode },
  })
  const minBidNum = (() => {
    const v = resultOf<bigint>(minBidQ.data)
    return typeof v === 'bigint' ? Number(v) / 1e18 : 0
  })()

  const lowestQ = useReadContracts({
    contracts: [
      { address: MERITPOOL_ADDRESS as `0x${string}`, abi: MERITPOOL_ABI, functionName: 'getLowestBid', args: [BigInt(idOnChain)] },
      { address: MERITPOOL_ADDRESS as `0x${string}`, abi: MERITPOOL_ABI, functionName: 'getBidCount', args: [BigInt(idOnChain)] },
    ],
    query: { enabled: !!detail?.pool.isAuctionMode },
  })
  const lowestBid = (() => {
    const r = resultOf<[string, bigint]>(lowestQ.data?.[0])
    if (!r || typeof r[1] !== 'bigint' || r[1] === BigInt(0)) return null
    return { bidder: r[0], amount: Number(r[1]) / 1e18 }
  })()
  const bidCount = (() => {
    const v = resultOf<bigint>(lowestQ.data?.[1])
    return typeof v === 'bigint' ? Number(v) : 0
  })()

  // Receipt watcher — diletakkan SETELAH semua deklarasi yang dirujuk
  const { data: receipt } = useWaitForTransactionReceipt({ hash: pendingHash ?? undefined })
  useEffect(() => {
    if (receipt && pendingHash) {
      toast('success', 'Transaksi berhasil', 'Konfirmasi on-chain diterima.', receipt.transactionHash)
      queueMicrotask(() => setPendingHash(null))
      refetchDetail()
      states.refetch()
      settleableQ.refetch()
      lowestQ.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt])

  const contributedQ = useReadContract({
    address: MERITPOOL_ADDRESS as `0x${string}`,
    abi: MERITPOOL_ABI,
    functionName: 'hasContributed',
    args: [BigInt(idOnChain), BigInt(state?.cycle ?? 0), (address ?? ZERO) as `0x${string}`],
    query: { enabled: !!address && !!state },
  })
  const hasContributedThisCycle = resultOf<boolean>(contributedQ.data) === true

  // ---- Aksi ----
  async function tx(fn: 'contribute') {
    try {
      const hash = await writeContractAsync({ address: MERITPOOL_ADDRESS, abi: MERITPOOL_ABI, functionName: fn, args: [BigInt(idOnChain)] })
      setPendingHash(hash)
    } catch (e) {
      const err = e as { shortMessage?: string; message?: string }
      toast('error', 'Transaksi gagal', err.shortMessage || err.message || 'Terjadi kesalahan')
    }
  }

  async function handlePlaceBid(amountMc: number) {
    try {
      const hash = await writeContractAsync({ address: MERITPOOL_ADDRESS, abi: MERITPOOL_ABI, functionName: 'placeBid', args: [BigInt(idOnChain), parseUnits(amountMc.toString(), 18)] })
      setPendingHash(hash)
      setBidInput('')
    } catch (e) {
      const err = e as { shortMessage?: string; message?: string }
      toast('error', 'Bid ditolak', err.shortMessage || err.message || 'Terjadi kesalahan')
    }
  }

  async function handleSettle() {
    try {
      let fallbackWinner: `0x${string}` = ZERO
      let fallbackSig: `0x${string}` = '0x'
      const res = await fetch('/api/pools/designation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolIdOnChain: idOnChain }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        fallbackWinner = data.winner as `0x${string}`
        fallbackSig = data.signature as `0x${string}`
      }
      const hash = await writeContractAsync({
        address: MERITPOOL_ADDRESS,
        abi: MERITPOOL_ABI,
        functionName: 'settleCycle',
        args: [BigInt(idOnChain), fallbackWinner, fallbackSig],
      })
      setPendingHash(hash)
    } catch (e) {
      const err = e as { shortMessage?: string; message?: string }
      toast('error', 'Settle gagal', err.shortMessage || err.message || 'Terjadi kesalahan')
    }
  }

  if (!Number.isInteger(idOnChain)) {
    return <p className="text-on-surface-variant">ID pool tidak valid.</p>
  }

  const pool = detail?.pool
  const remaining = state && nowTs ? state.deadline - nowTs : null
  const countdown =
    remaining === null
      ? '—'
      : remaining > 0
        ? `${Math.floor(remaining / 60)}m ${remaining % 60}s`
        : 'Deadline tercapai'

  const STATUS_TEXT = ['Pendaftaran terbuka', 'Aktif', 'Selesai']

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-5xl mx-auto pb-10 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {pool ? <TierBadge tier={pool.tierRequired} size="lg" /> : null}
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface tracking-tighter">
              {pool?.name ?? '…'}
            </h1>
            <p className="font-mono-label text-mono-label text-[#3E63FF] uppercase">
              {state ? STATUS_TEXT[state.status] : 'Memuat'} · Tier min. {pool?.tierRequired ?? '—'}
            </p>
          </div>
        </div>
        <div className="rounded-full border border-[#3e63ff]/30 bg-[#10131A]/60 px-4 py-2 font-mono text-sm text-[#E2E2E9]">
          {pool?.contributionAmount.toLocaleString()} MC / siklus · Hadiah {pool?.totalYield.toLocaleString()} MC
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Anggota', value: `${state?.memberCount ?? 0}/${pool?.poolSize ?? '—'}` },
          { label: 'Cycle', value: state && state.status === 1 ? `${state.cycle} / ${pool?.poolSize ?? '—'}` : '—' },
          { label: 'Terkumpul cycle ini', value: `${(state?.collected ?? 0).toLocaleString()} MC` },
          { label: state?.status === 1 ? 'Deadline' : 'Status', value: state?.status === 1 ? countdown : state ? STATUS_TEXT[state.status] : '—' },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-2xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">{s.label}</p>
            <p className="mt-1 font-mono text-lg font-bold text-[#E2E2E9]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Auction live */}
      {pool?.isAuctionMode && (
        <div className="glass-panel rounded-3xl p-6 border-[#ffb020]/25">
          <h2 className="flex items-center gap-2 font-body-md text-body-md font-semibold text-[#ffb020] uppercase font-mono-label tracking-wide">
            Lelang Diskon — bid terendah menang
          </h2>
          <p className="text-sm text-[#C3C6D3] mt-1">
            Tawarkan payout yang Anda terima untuk cycle ini. Batas bawah {minBidNum.toLocaleString()} MC (diskon maks 15%). Pemenang menerima jumlah bidnya.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[#3e63ff]/20 bg-[#10131A]/60 p-4">
              <p className="font-mono text-[10px] uppercase text-[#C3C6D3]">Bid terendah saat ini</p>
              <p className="font-mono text-xl font-bold text-[#E2E2E9] mt-1">
                {lowestBid ? `${lowestBid.amount.toLocaleString()} MC` : 'Belum ada'}
              </p>
              {lowestBid && (
                <p className="font-mono text-[10px] text-[#C3C6D3] mt-0.5">
                  oleh {detail?.members.find((m) => m.wallet === lowestBid.bidder)?.username ?? `${lowestBid.bidder.slice(0, 8)}…`}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-[#3e63ff]/20 bg-[#10131A]/60 p-4">
              <p className="font-mono text-[10px] uppercase text-[#C3C6D3]">Jumlah bid</p>
              <p className="font-mono text-xl font-bold text-[#E2E2E9] mt-1">{bidCount}</p>
            </div>
            {/* Form bid */}
            <div className="rounded-2xl border border-[#3e63ff]/20 bg-[#10131A]/60 p-4">
              <p className="font-mono text-[10px] uppercase text-[#C3C6D3]">Pasang bid Anda</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={bidInput}
                  onChange={(e) => setBidInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder={`${minBidNum.toFixed(0)}+`}
                  inputMode="decimal"
                  className="min-w-0 flex-1 rounded-lg border border-outline-variant/40 bg-surface-container/50 px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => {
                    const v = parseFloat(bidInput)
                    if (!Number.isFinite(v) || v < minBidNum) {
                      toast('error', 'Bid tidak valid', `Minimal ${minBidNum.toLocaleString()} MC.`)
                      return
                    }
                    handlePlaceBid(v)
                  }}
                  disabled={isWritePending || !address || !hasContributedThisCycle}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                    isWritePending || !address || !hasContributedThisCycle
                      ? 'bg-white/10 text-white/50 cursor-not-allowed'
                      : 'bg-[#ffb020] text-black hover:bg-[#ffca66]',
                  )}
                >
                  Bid
                </button>
              </div>
              {!hasContributedThisCycle && address && state?.status === 1 && (
                <button onClick={() => tx('contribute')} disabled={isWritePending} className="mt-2 w-full rounded-lg border border-secondary-fixed/40 bg-secondary-fixed/10 px-3 py-1.5 text-xs font-semibold text-secondary-fixed hover:bg-secondary-fixed/20">
                  Bayar iuran dulu untuk bisa bid
                </button>
              )}
            </div>
          </div>

          {/* Daftar bid */}
          {!!detail?.auction?.bids.length && (
            <div className="mt-4 space-y-1.5">
              {[...detail.auction.bids]
                .sort((a, b) => a.amount - b.amount)
                .map((b, i) => (
                  <div key={`${b.userWallet}-${i}`} className="flex justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs">
                    <span className="text-[#C3C6D3]">@{b.username ?? `${b.userWallet.slice(0, 8)}…`}</span>
                    <span className="font-mono text-[#E2E2E9]">{b.amount.toLocaleString()} MC</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Anggota + Riwayat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="font-mono-label text-mono-label text-[#3E63FF] uppercase mb-3">Anggota ({detail?.members.length ?? 0})</h2>
          <div className="space-y-2">
            {(detail?.members ?? []).map((m) => (
              <div key={m.wallet} className="flex items-center justify-between rounded-xl border border-[#3e63ff]/15 bg-[#10131A]/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#E2E2E9] truncate">@{m.username}</p>
                  <p className="font-mono text-[10px] text-[#C3C6D3]">{m.wallet.slice(0, 10)}…</p>
                </div>
                <span className="font-mono text-xs text-[#5B7CFF]">Merit {m.meritScore} · T{calculateTier(m.meritScore)}</span>
              </div>
            ))}
            {detail && Array.from({ length: Math.max(0, pool!.poolSize - detail.members.length) }).map((_, i) => (
              <div key={`slot-${i}`} className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs text-[#C3C6D3]/50 text-center">
                Slot kosong — menunggu anggota
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h2 className="font-mono-label text-mono-label text-[#FFC857] uppercase mb-3">Riwayat Payout</h2>
          {(detail?.payoutsHistory.length ?? 0) === 0 ? (
            <p className="text-xs text-[#C3C6D3]">Belum ada payout di pool ini.</p>
          ) : (
            <div className="space-y-2">
              {detail!.payoutsHistory.map((p) => (
                <div key={`${p.round}-${p.cycle}`} className="flex items-center justify-between rounded-xl border border-[#3e63ff]/15 bg-[#10131A]/50 px-3 py-2">
                  <div>
                    <p className="text-sm text-[#E2E2E9]">🏆 @{p.winnerUsername ?? `${p.winnerWallet.slice(0, 8)}…`}</p>
                    <p className="font-mono text-[10px] text-[#C3C6D3]">Round {p.round} · Cycle {p.cycle}{p.surplus > 0 ? ` · surplus ${p.surplus.toLocaleString()} MC` : ''}</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#56ffa8]">{p.payoutAmount.toLocaleString()} MC</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settle keeper-lite */}
      {settleable && state?.status === 1 && (
        <button
          onClick={handleSettle}
          disabled={isWritePending}
          className={cn(
            'w-full py-3 rounded-full text-sm font-semibold transition-all',
            isWritePending ? 'loading-state cursor-wait bg-[#3E63FF] text-white' : 'bg-[#10131A]/70 border border-[#3e63ff]/40 text-[#E2E2E9] hover:border-[#3E63FF]',
          )}
        >
          {isWritePending ? 'Menutup cycle…' : 'Tutup Cycle Sekarang (Settle)'}
        </button>
      )}

      {isDetailLoading && <div className="mc-skeleton h-40 w-full" />}
    </motion.div>
  )
}
