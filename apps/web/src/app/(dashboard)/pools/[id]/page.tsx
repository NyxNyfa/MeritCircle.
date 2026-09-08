'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useSignMessage, usePublicClient } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { parseUnits, formatUnits } from 'viem'
import { cn } from '@/lib/utils'
import { MERITPOOL_ABI, MCIRCLE_ABI } from '@/config/contracts'
import { useContractAddresses } from '@/lib/use-contracts'
import { calculateTier } from '@/lib/tier'
import TierBadge from '@/components/TierBadge'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { getSessionAuthHeaders } from '@/lib/wallet-auth-client'
import { sendBrowserNotification } from '@/lib/push-notifications'
import { parseTxError } from '@/lib/use-transaction'

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
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const idOnChain = Number(params?.id ?? NaN)
  const { address } = useAccount()
  const { toast } = useToast()
  const { meritPool: MERITPOOL_ADDRESS, mcToken: MCIRCLE_ADDRESS } = useContractAddresses()
  const publicClient = usePublicClient()
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
      { address: MERITPOOL_ADDRESS as `0x${string}`, abi: MERITPOOL_ABI, functionName: 'getPoolState', args: [BigInt(idOnChain), (address ?? ZERO) as `0x${string}`] },
    ],
    query: { enabled: Number.isInteger(idOnChain) },
  })
  type StateTuple = [number, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
  const state = (() => {
    const r = resultOf<StateTuple>(states.data?.[0])
    if (!r) return undefined
    return {
      status: Number(r[0]),
      round: Number(r[1]),
      cycle: Number(r[2]),
      deadline: Number(r[3]),
      collected: Number(r[4]) / 1e18,
      memberCount: Number(r[5]),
      cohortId: Number(r[6]),
      activeGroups: Number(r[7]),
    }
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

  const activeCohortId = BigInt(state?.cohortId && state.cohortId > 0 ? state.cohortId : 1)
  const lowestQ = useReadContracts({
    contracts: [
      { address: MERITPOOL_ADDRESS as `0x${string}`, abi: MERITPOOL_ABI, functionName: 'getLowestBid', args: [BigInt(idOnChain), activeCohortId] },
      { address: MERITPOOL_ADDRESS as `0x${string}`, abi: MERITPOOL_ABI, functionName: 'getBidCount', args: [BigInt(idOnChain), activeCohortId] },
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
    args: [
      BigInt(idOnChain),
      BigInt(state?.cohortId ?? 1),
      BigInt(state?.cycle ?? 1),
      (address ?? ZERO) as `0x${string}`,
    ],
    query: { enabled: !!address && !!state },
  })
  const hasContributedThisCycle = resultOf<boolean>(contributedQ.data) === true

  const { signMessageAsync } = useSignMessage()

  // User Profile
  const { data: userProfile } = useQuery<{ username: string; meritScore: number; memberPoolIds: string[] } | null>({
    queryKey: ['userProfile', address],
    queryFn: async () => {
      if (!address) return null
      const res = await fetch(`/api/users/${address}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!address,
  })

  // Allowance check
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: MCIRCLE_ADDRESS,
    abi: MCIRCLE_ABI,
    functionName: 'allowance',
    args: address && MERITPOOL_ADDRESS ? [address, MERITPOOL_ADDRESS] : undefined,
    query: { enabled: !!address && !!MERITPOOL_ADDRESS },
  })
  const allowanceNum = allowanceData ? Number(allowanceData as bigint) / 1e18 : 0

  // User cohort check on-chain (0 jika tidak terdaftar atau sudah completed)
  const { data: userCohortData, refetch: refetchUserCohort } = useReadContract({
    address: MERITPOOL_ADDRESS,
    abi: MERITPOOL_ABI,
    functionName: 'userCohort',
    args: address && Number.isInteger(idOnChain) ? [address as `0x${string}`, BigInt(idOnChain)] : undefined,
    query: { enabled: !!address && Number.isInteger(idOnChain) },
  })
  const userCohortNum = userCohortData ? Number(userCohortData as bigint) : 0

  const isUserMember = !!address && userCohortNum > 0 && state?.status !== 2
  const isFormingState = isUserMember && state?.status === 0
  const isActiveState = isUserMember && state?.status === 1

  // Auto-settle ticker untuk background polling
  useEffect(() => {
    if (!Number.isInteger(idOnChain)) return
    const triggerAutoSettle = async () => {
      try {
        const res = await fetch('/api/pools/auto-settle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poolIdOnChain: idOnChain }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.results?.length) {
            await queryClient.invalidateQueries()
            refetchDetail()
            states.refetch()
            contributedQ.refetch()
            settleableQ.refetch()
            refetchAllowance()
            refetchUserCohort()
            toast('success', '🏆 Pemenang Arisan Terpilih!', 'Undian arisan siklus selesai dan hadiah telah ditransfer langsung on-chain.')
            sendBrowserNotification(
              '🏆 Pemenang Arisan Terpilih!',
              'Undian arisan telah selesai dan hadiah telah ditransfer langsung on-chain.'
            )
          }
        }
      } catch {
        // silent
      }
    }
    const interval = setInterval(triggerAutoSettle, 6000)
    triggerAutoSettle()
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOnChain])

  const queryClient = useQueryClient()
  const [processingStage, setProcessingStage] = useState<string | null>(null)
  const [processingLabel, setProcessingLabel] = useState<string | null>(null)

  // Handle Approve Token
  const handleApprove = async () => {
    if (!address || !pool) return
    try {
      setProcessingStage('approving')
      setProcessingLabel('Menyetujui di Dompet…')
      toast('info', 'Menyetujui Token MC…', 'Silakan konfirmasi persetujuan token di dompet Anda.')

      const hash = await writeContractAsync({
        address: MCIRCLE_ADDRESS,
        abi: MCIRCLE_ABI,
        functionName: 'approve',
        args: [MERITPOOL_ADDRESS, parseUnits('1000000', 18)],
      })

      setProcessingStage('waiting_approve')
      setProcessingLabel('Mengonfirmasi Persetujuan…')
      if (publicClient) {
        const rcpt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (rcpt.status === 'reverted') throw new Error('Persetujuan token gagal di blockchain.')
      }
      toast('success', 'Token Disetujui', 'Izin penarikan token MC aktif.')
      refetchAllowance()
    } catch (e) {
      const msg = parseTxError(e)
      toast(msg.includes('dibatalkan') ? 'info' : 'error', 'Persetujuan Token', msg)
    } finally {
      setProcessingStage(null)
      setProcessingLabel(null)
    }
  }

  // Handle Join Pool
  const handleJoin = async () => {
    if (!address || !pool) return
    try {
      // 1. Cek allowance on-chain real-time
      setProcessingStage('checking')
      setProcessingLabel('Memeriksa izin token…')

      let currentAllowanceNum = 0
      if (publicClient) {
        const onChainAllowance = await publicClient.readContract({
          address: MCIRCLE_ADDRESS,
          abi: MCIRCLE_ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, MERITPOOL_ADDRESS],
        })
        currentAllowanceNum = Number(formatUnits(onChainAllowance as bigint, 18))
      }

      if (currentAllowanceNum < pool.contributionAmount) {
        setProcessingStage('approving')
        setProcessingLabel('Menyetujui di Dompet…')
        toast('info', 'Menyetujui Token MC…', 'Silakan konfirmasi persetujuan token di dompet Anda.')

        const approveHash = await writeContractAsync({
          address: MCIRCLE_ADDRESS,
          abi: MCIRCLE_ABI,
          functionName: 'approve',
          args: [MERITPOOL_ADDRESS, parseUnits('1000000', 18)],
        })

        setProcessingStage('waiting_approve')
        setProcessingLabel('Mengonfirmasi Persetujuan…')
        if (publicClient) {
          const rcpt = await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 })
          if (rcpt.status === 'reverted') throw new Error('Persetujuan token gagal di blockchain.')
        }
        refetchAllowance()
      }

      // 2. Ambil signature backend
      setProcessingStage('signing')
      setProcessingLabel('Memverifikasi Izin…')
      const res = await fetch('/api/pools/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, poolId: pool.id }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Gagal mendapatkan izin tanda tangan')
      }
      const { userTier, signature } = await res.json()

      // 3. Eksekusi joinPool
      setProcessingStage('joining')
      setProcessingLabel('Konfirmasi Join di Dompet…')
      const hash = await writeContractAsync({
        address: MERITPOOL_ADDRESS,
        abi: MERITPOOL_ABI,
        functionName: 'joinPool',
        args: [BigInt(idOnChain), BigInt(userTier), signature],
      })

      setProcessingStage('waiting_join')
      setProcessingLabel('Mendaftarkan di Blockchain…')
      if (publicClient) {
        const rcpt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (rcpt.status === 'reverted') throw new Error('Pendaftaran pool gagal di blockchain.')
      }

      // 4. Catat off-chain
      const headers = await getSessionAuthHeaders(address, signMessageAsync)
      fetch('/api/pools/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ poolId: pool.id }),
      }).catch(() => undefined)

      toast('success', `Berhasil Masuk ${pool.name}!`, 'Anda telah terdaftar di arisan.', hash)
      sendBrowserNotification(`✅ Bergabung di ${pool.name}`, 'Anda telah berhasil mendaftar ke arisan.')

      await queryClient.invalidateQueries()
      refetchDetail()
      states.refetch()
      contributedQ.refetch()
      settleableQ.refetch()
      refetchAllowance()

      fetch('/api/pools/auto-settle', { method: 'POST' }).catch(() => undefined)
    } catch (e) {
      const msg = parseTxError(e)
      if (msg.includes('dibatalkan')) {
        toast('info', 'Pendaftaran Dibatalkan', msg)
      } else {
        toast('error', 'Join Gagal', msg)
      }
    } finally {
      setProcessingStage(null)
      setProcessingLabel(null)
    }
  }

  // Handle Place Bid (Lelang Diskon)
  const handlePlaceBid = async (amountMc: number) => {
    try {
      setProcessingStage('bidding')
      setProcessingLabel('Konfirmasi Bid di Dompet…')
      const hash = await writeContractAsync({
        address: MERITPOOL_ADDRESS,
        abi: MERITPOOL_ABI,
        functionName: 'placeBid',
        args: [BigInt(idOnChain), parseUnits(amountMc.toString(), 18)],
      })

      setProcessingStage('waiting_bid')
      setProcessingLabel('Mencatat Bid di Blockchain…')
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
      }

      setBidInput('')
      toast('success', 'Bid Lelang Tercatat!', `Tawaran payout ${amountMc.toLocaleString()} MC telah dipasang.`, hash)
      await queryClient.invalidateQueries()
      refetchDetail()
    } catch (e) {
      const msg = parseTxError(e)
      toast(msg.includes('dibatalkan') ? 'info' : 'error', 'Pemasangan Bid', msg)
    } finally {
      setProcessingStage(null)
      setProcessingLabel(null)
    }
  }

  // Handle Contribute (Bayar Iuran Bulanan)
  const handleContribute = async () => {
    if (!address || !pool) return
    try {
      // 1. Cek allowance
      setProcessingStage('checking')
      setProcessingLabel('Memeriksa izin token…')

      let currentAllowanceNum = 0
      if (publicClient) {
        const onChainAllowance = await publicClient.readContract({
          address: MCIRCLE_ADDRESS,
          abi: MCIRCLE_ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, MERITPOOL_ADDRESS],
        })
        currentAllowanceNum = Number(formatUnits(onChainAllowance as bigint, 18))
      }

      if (currentAllowanceNum < pool.contributionAmount) {
        setProcessingStage('approving')
        setProcessingLabel('Menyetujui di Dompet…')
        toast('info', 'Menyetujui Token MC…', 'Silakan konfirmasi persetujuan token di dompet Anda.')

        const approveHash = await writeContractAsync({
          address: MCIRCLE_ADDRESS,
          abi: MCIRCLE_ABI,
          functionName: 'approve',
          args: [MERITPOOL_ADDRESS, parseUnits('1000000', 18)],
        })

        setProcessingStage('waiting_approve')
        setProcessingLabel('Mengonfirmasi Persetujuan…')
        if (publicClient) {
          const rcpt = await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 })
          if (rcpt.status === 'reverted') throw new Error('Persetujuan token gagal di blockchain.')
        }
        refetchAllowance()
      }

      // 2. Eksekusi contribute
      setProcessingStage('contributing')
      setProcessingLabel('Konfirmasi Iuran di Dompet…')
      const hash = await writeContractAsync({
        address: MERITPOOL_ADDRESS,
        abi: MERITPOOL_ABI,
        functionName: 'contribute',
        args: [BigInt(idOnChain)],
      })

      setProcessingStage('waiting_contribute')
      setProcessingLabel('Mengonfirmasi Pembayaran Iuran…')
      if (publicClient) {
        const rcpt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (rcpt.status === 'reverted') throw new Error('Pembayaran iuran gagal di blockchain.')
      }

      toast('success', `Iuran ${pool.name} Berhasil Dibayar!`, `Pembayaran ${pool.contributionAmount} MC sukses.`, hash)
      sendBrowserNotification(`💳 Iuran ${pool.name} Dibayar`, `Pembayaran iuran sebesar ${pool.contributionAmount} MC berhasil dikirim.`)

      await queryClient.invalidateQueries()
      refetchDetail()
      states.refetch()
      contributedQ.refetch()
      settleableQ.refetch()
      refetchAllowance()

      fetch('/api/pools/auto-settle', { method: 'POST' }).catch(() => undefined)
    } catch (e) {
      const msg = parseTxError(e)
      if (msg.includes('dibatalkan')) {
        toast('info', 'Pembayaran Dibatalkan', msg)
      } else {
        toast('error', 'Pembayaran Iuran Gagal', msg)
      }
    } finally {
      setProcessingStage(null)
      setProcessingLabel(null)
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
      {/* Back Button */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-2 text-[#C3C6D3] hover:text-white hover:bg-white/5 gap-2 px-3 py-1.5 h-auto text-sm font-medium"
        >
          ← Kembali
        </Button>
      </div>

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

      {/* Action Banner (Join / Bayar Iuran Sesuai Requirement §5) */}
      <div className="glass-panel rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-[#3e63ff]/30 bg-[#10131A]/70">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-wider text-[#C3C6D3]">Aksi Arisan</p>
          <p className="text-sm font-semibold text-[#E2E2E9]">
            {!isUserMember
              ? `Bergabung ke ${pool?.name} (${pool?.contributionAmount} MC / siklus)`
              : isFormingState
                ? 'Pendaftaran Berhasil · Menunggu Kuota Anggota Penuh'
                : !hasContributedThisCycle
                  ? `Siklus ${state?.cycle ?? 1} Sedang Berjalan · Iuran Belum Dibayar`
                  : `Siklus ${state?.cycle ?? 1} Lunas · Menunggu Undian Pemenang`}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isUserMember ? (
            allowanceNum < (pool?.contributionAmount ?? 0) ? (
              <Button
                onClick={() => handleApprove()}
                disabled={isWritePending || !!processingStage}
                className="w-full sm:w-auto rounded-full bg-[#10131A] border border-[#3e63ff]/50 text-[#E2E2E9] hover:border-[#3E63FF] px-6 py-2.5 font-semibold text-sm"
              >
                {processingStage ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    {processingLabel || 'Memproses…'}
                  </>
                ) : (
                  'Approve Token MC'
                )}
              </Button>
            ) : (
              <Button
                onClick={() => handleJoin()}
                disabled={isWritePending || !!processingStage}
                className="w-full sm:w-auto rounded-full bg-[#3E63FF] text-white hover:bg-[#5B7CFF] px-6 py-2.5 font-semibold text-sm shadow-[0_0_15px_rgba(62,99,255,0.4)]"
              >
                {processingStage ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    {processingLabel || 'Memproses…'}
                  </>
                ) : (
                  'Join Pool Ini'
                )}
              </Button>
            )
          ) : isFormingState ? (
            <div className="rounded-full bg-[#FFC857]/10 border border-[#FFC857]/30 text-[#FFC857] px-5 py-2 font-mono text-xs font-bold uppercase">
              🔒 Menunggu Anggota Lain
            </div>
          ) : !hasContributedThisCycle ? (
            <Button
              onClick={() => handleContribute()}
              disabled={isWritePending || !!processingStage}
              className="w-full sm:w-auto rounded-full bg-[#56ffa8] text-black hover:bg-[#7affbf] px-6 py-2.5 font-bold text-sm shadow-[0_0_20px_rgba(86,255,168,0.4)]"
            >
              {processingStage ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  {processingLabel || 'Memproses…'}
                </>
              ) : (
                `💳 Bayar Iuran (${pool?.contributionAmount} MC)`
              )}
            </Button>
          ) : (
            <div className="rounded-full bg-secondary-fixed/10 border border-secondary-fixed/30 text-secondary-fixed px-5 py-2 font-mono text-xs font-bold uppercase flex items-center gap-1.5">
              ✅ Iuran Lunas · Menunggu Undian
            </div>
          )}
        </div>
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
                  disabled={isWritePending || !address || !hasContributedThisCycle || !!processingStage}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                    isWritePending || !address || !hasContributedThisCycle || !!processingStage
                      ? 'bg-white/10 text-white/50 cursor-not-allowed'
                      : 'bg-[#ffb020] text-black hover:bg-[#ffca66]',
                  )}
                >
                  {processingStage === 'bidding' || processingStage === 'waiting_bid' ? (
                    <span className="inline-block animate-spin">⏳</span>
                  ) : (
                    'Bid'
                  )}
                </button>
              </div>
              {!hasContributedThisCycle && address && state?.status === 1 && (
                <button onClick={() => handleContribute()} disabled={isWritePending} className="mt-2 w-full rounded-lg border border-secondary-fixed/40 bg-secondary-fixed/10 px-3 py-1.5 text-xs font-semibold text-secondary-fixed hover:bg-secondary-fixed/20">
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

      {/* Status Kelompok & Riwayat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-mono-label text-mono-label text-[#3E63FF] uppercase mb-3">
              Status Kelompok ({detail ? `${detail.members.length % (pool?.poolSize || 3)} / ${pool?.poolSize || 3} Terisi` : '…'})
            </h2>
            
            <div className="space-y-3">
              {/* Status Partisipasi User */}
              <div className="rounded-2xl border border-[#3e63ff]/20 bg-[#10131A]/60 p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">Status Anda</p>
                <div className="mt-1 flex items-center justify-between">
                  {(() => {
                    const isUserMember = !!address && !!detail?.members.some((m) => m.wallet.toLowerCase() === address.toLowerCase())
                    return (
                      <>
                        <span className="text-sm font-semibold text-[#E2E2E9]">
                          {isUserMember ? '🔒 Terdaftar & Terkunci di Pool Ini' : '🔓 Belum Bergabung'}
                        </span>
                        <span className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono uppercase',
                          isUserMember
                            ? 'border border-[#56ffa8]/40 bg-[#56ffa8]/10 text-[#56ffa8]'
                            : 'border border-[#3e63ff]/30 bg-[#3E63FF]/10 text-[#A9C7FF]'
                        )}>
                          {isUserMember ? 'MEMBER' : 'AVAILABLE'}
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Kuota Anggota Kelompok Aktif */}
              <div className="rounded-2xl border border-[#3e63ff]/15 bg-[#10131A]/40 p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#C3C6D3]">Kapasitas Kelompok Baru</span>
                  <span className="font-mono font-bold text-[#FFC857]">
                    {detail ? detail.members.length % (pool?.poolSize || 3) : 0} / {pool?.poolSize || 3} Anggota
                  </span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FFC857]/50 to-[#FFC857] rounded-full transition-all duration-500"
                    style={{
                      width: `${detail ? Math.min(100, ((detail.members.length % (pool?.poolSize || 3)) / (pool?.poolSize || 3)) * 100) : 0}%`
                    }}
                  />
                </div>
                <p className="text-[11px] text-[#A9C7FF]/70 italic leading-snug">
                  *Setiap kelompok yang terisi penuh ({pool?.poolSize} anggota) otomatis menjadi kelompok aktif yang menjalankan siklus arisan.
                </p>
              </div>
            </div>
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

      {isDetailLoading && <div className="mc-skeleton h-40 w-full" />}
    </motion.div>
  )
}
