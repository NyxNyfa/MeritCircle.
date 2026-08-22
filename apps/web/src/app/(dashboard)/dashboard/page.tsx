'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSignMessage,
} from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { formatUnits, parseUnits } from 'viem'
import {
  MCIRCLE_ABI,
  MERITPOOL_ABI,
} from '@/config/contracts'
import { useContractAddresses } from '@/lib/use-contracts'
import { POOL_REGISTRY } from '@/config/pools'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/Icon'
import PoolCard, { type Pool } from '@/components/PoolCard'
import type { UserProfile } from '@/components/Sidebar'
import { useRegisterModal } from '@/lib/register-modal'
import { createWalletAuthHeader } from '@/lib/wallet-auth-client'
import { calculateTier } from '@/lib/tier'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const reasonOf = (error: unknown) => {
  const e = error as { shortMessage?: string; message?: string }
  return e.shortMessage || e.message || 'Terjadi kesalahan'
}

type ReadResult<T = unknown> = { result?: T; error?: Error; status: string }
const resultOf = <T,>(r: unknown): T | undefined => (r as ReadResult<T> | undefined)?.result

type ReceiptTicket = {
  hash: `0x${string}`
  label: string
  approveForPoolId?: string
}

type DbPool = {
  id: string
  poolIdOnChain: number
  name: string
  poolSize: number
  contributionAmount: number
  tierRequired: number
  totalYield: number
  isAuctionMode: boolean
  memberCount: number
}

function Skeleton({ className }: { className: string }) {
  return <div className={`mc-skeleton ${className}`} />
}

export default function DashboardPage() {
  const { address } = useAccount()
  const { toast } = useToast()
  const { openRegister } = useRegisterModal()
  const { signMessageAsync } = useSignMessage()
  const { mcToken: MCIRCLE_ADDRESS, meritPool: MERITPOOL_ADDRESS } = useContractAddresses()

  const [joiningPoolId, setJoiningPoolId] = useState<string | null>(null)
  const [pendingReceipt, setPendingReceipt] = useState<ReceiptTicket | null>(null)

  // ---------- Off-chain data (React Query) ----------
  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ['userProfile', address],
    queryFn: async () => {
      if (!address) return null
      const res = await fetch(`/api/users/${address}`)
      if (!res.ok) throw new Error('User belum terdaftar')
      return res.json()
    },
    enabled: !!address,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const { data: dbPools, refetch: refetchPools } = useQuery<DbPool[]>({
    queryKey: ['pools'],
    queryFn: async () => {
      const res = await fetch('/api/pools')
      if (!res.ok) throw new Error('Gagal memuat pools')
      return res.json()
    },
    refetchOnWindowFocus: false,
  })

  // ---------- Registry 6 Pool (sinkron MeritPool.sol) + merge data live dari DB ----------
  const pools: Pool[] = POOL_REGISTRY.map((cfg) => {
    const db = dbPools?.find((p) => p.poolIdOnChain === cfg.poolIdOnChain)
    return {
      id: db?.id ?? `pool-${cfg.poolIdOnChain}`,
      poolIdOnChain: cfg.poolIdOnChain,
      name: db?.name ?? cfg.name,
      poolSize: db?.poolSize ?? cfg.poolSize,
      contributionAmount: db?.contributionAmount ?? cfg.contributionAmount,
      tierRequired: db?.tierRequired ?? cfg.tierRequired,
      totalYield: db?.totalYield ?? cfg.totalYield,
      isAuctionMode: db?.isAuctionMode ?? cfg.isAuctionMode,
      memberCount: db?.memberCount ?? 0,
    }
  })

  // ---------- On-chain data (Wagmi) ----------
  const {
    data: balanceData,
    refetch: refetchBalance,
  } = useReadContract({
    address: MCIRCLE_ADDRESS,
    abi: MCIRCLE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const mcBalanceNum = balanceData ? Number(formatUnits(balanceData as bigint, 18)) : 0

  // Allowance MC -> MeritPool (dibutuhkan sebelum joinPool menarik iuran)
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: MCIRCLE_ADDRESS,
    abi: MCIRCLE_ABI,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, MERITPOOL_ADDRESS] : undefined,
    query: { enabled: !!address },
  })
  const allowanceNum = Number(allowanceData ?? BigInt(0)) / 1e18

  // lastWinner per pool — pemenang siklus SEBELUMNYA (di-set saat cycle selesai, lalu cycle di-increment)
  const winnersRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'lastWinner',
      args: [BigInt(cfg.poolIdOnChain)],
    })),
  })
  const winnerAddresses = useMemo(
    () =>
      winnersRead.data?.map((r) => {
        const value = resultOf<string>(r)
        return typeof value === 'string' && value.toLowerCase() !== ZERO_ADDRESS ? value.toLowerCase() : null
      }) ?? [],
    [winnersRead.data],
  )

  // currentCycle per pool — dibutuhkan untuk mengecek keanggotaan di siklus aktif
  const cyclesRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'currentCycle',
      args: [BigInt(cfg.poolIdOnChain)],
    })),
  })
  const cycles = cyclesRead.data ?? []

  // hasJoined[poolId][cycleId][user] — apakah user sudah join di siklus aktif pool tersebut
  const joinedRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'hasJoined',
      args: [
        BigInt(cfg.poolIdOnChain),
        resultOf<bigint>(cycles[cfg.poolIdOnChain]) ?? BigInt(0),
        (address ?? ZERO_ADDRESS) as `0x${string}`,
      ],
    })),
    query: { enabled: !!address && cycles.some((c) => resultOf<bigint>(c) !== undefined) },
  })
  const joinedFlags = joinedRead.data?.map((r) => resultOf<boolean>(r) === true) ?? []

  // Resolve alamat pemenang -> username dari database
  const { data: winnerUsernames, refetch: refetchWinners } = useQuery<Record<string, string>>({
    queryKey: ['lastWinners', winnerAddresses.join(',')],
    queryFn: async () => {
      const map: Record<string, string> = {}
      const uniq = [...new Set(winnerAddresses.filter((a): a is string => !!a))]
      await Promise.all(
        uniq.map(async (addr) => {
          try {
            const res = await fetch(`/api/users/${addr}`)
            if (res.ok) {
              const u = await res.json()
              map[addr] = u.username
            }
          } catch {
            // abai — pool baru tanpa pemenang
          }
        }),
      )
      return map
    },
    enabled: winnerAddresses.some(Boolean),
  })

  // ---------- Write mutations ----------
  const joinWrite = useWriteContract()
  const approveWrite = useWriteContract()

  // ---------- Handlers (di-deklarasikan sebelum receipt effect agar bisa dirantai) ----------
  const handleJoinPool = async (poolId: string) => {
    if (!address) {
      toast('error', 'Wallet belum terhubung', 'Sambungkan wallet Anda terlebih dahulu.')
      return
    }
    try {
      const pool = pools.find((p) => p.id === poolId)
      if (!pool) return
      setJoiningPoolId(poolId)
      // Endpoint resmi penandatanganan backend (risk gate tier + auction di sisi server)
      const res = await fetch('/api/pools/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, poolId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast('error', 'Tidak memenuhi syarat', data.error || 'Gabung pool ditolak')
        return
      }
      const hash = await joinWrite.writeContractAsync({
        address: MERITPOOL_ADDRESS,
        abi: MERITPOOL_ABI,
        functionName: 'joinPool',
        args: [BigInt(pool.poolIdOnChain), BigInt(data.userTier as number), data.signature as `0x${string}`],
      })
      // Catat keanggotaan off-chain agar progress bar member ter-update (wajib tanda tangan wallet)
      const authHeader = await createWalletAuthHeader(address, signMessageAsync)
      await fetch('/api/pools/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-mp-auth': authHeader },
        body: JSON.stringify({ poolId }),
      })
      setPendingReceipt({ hash, label: 'Berhasil masuk pool' })
    } catch (error) {
      toast('error', 'Gabung pool dibatalkan', reasonOf(error))
    } finally {
      setJoiningPoolId(null)
    }
  }

  const handleApprove = async (poolId: string, amount: number) => {
    try {
      const amountInWei = parseUnits(amount.toString(), 18)
      const hash = await approveWrite.writeContractAsync({
        address: MCIRCLE_ADDRESS,
        abi: MCIRCLE_ABI,
        functionName: 'approve',
        args: [MERITPOOL_ADDRESS, amountInWei],
      })
      setPendingReceipt({ hash, label: 'Izin token (Approve) diberikan', approveForPoolId: poolId })
    } catch (error) {
      toast('error', 'Approve dibatalkan', reasonOf(error))
    }
  }

  const { data: receipt, isError: isReceiptError } = useWaitForTransactionReceipt({
    hash: pendingReceipt?.hash,
  })

  useEffect(() => {
    if (receipt && pendingReceipt) {
      toast('success', pendingReceipt.label, 'Transaksi berhasil dikonfirmasi di on-chain.', receipt.transactionHash)
      const approveForPoolId = pendingReceipt.approveForPoolId
      queueMicrotask(() => setPendingReceipt(null))
      refetchBalance()
      refetchPools()
      refetchAllowance()
      refetchWinners()
      winnersRead.refetch()
      cyclesRead.refetch()
      joinedRead.refetch()
      // Approve sukses -> langsung lanjut otomatis ke joinPool (tanpa klik kedua)
      if (approveForPoolId) {
        const poolId = approveForPoolId
        queueMicrotask(() => handleJoinPool(poolId))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt])

  useEffect(() => {
    if (isReceiptError && pendingReceipt) {
      toast('error', pendingReceipt.label, 'Transaksi gagal / dibatalkan di on-chain.')
      queueMicrotask(() => setPendingReceipt(null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReceiptError])

  // ---------- Derived ----------
  const userTier = userProfile ? calculateTier(userProfile.meritScore) : 0

  return (
    <>
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4">
        <div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface tracking-tighter">
            Available Pools
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Gabung arisan on-chain — kontribusi, hadiah, dan pemenang tiap siklus.
          </p>
        </div>
        {/* Filters */}
        <div className="flex items-center gap-1 bg-[#1d2027]/60 p-1 rounded-full border border-[#3e63ff]/30 backdrop-blur-md">
          <button className="px-4 py-1.5 rounded-full bg-[#3E63FF] text-white shadow-[0px_0px_15px_rgba(62,99,255,0.4)] font-mono-label text-mono-label transition-colors">
            All
          </button>
          <button className="px-4 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-[#3E63FF]/10 font-mono-label text-mono-label transition-colors">
            Active
          </button>
          <button className="px-4 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-[#3E63FF]/10 font-mono-label text-mono-label transition-colors">
            Completed
          </button>
        </div>
      </header>

      {/* 6 Pool Cards — registri dari MeritPool.sol */}
      {!dbPools ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {POOL_REGISTRY.map((_, i) => (
            <div key={i} className="glass-panel rounded-3xl w-full max-w-[320px] h-[470px] p-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="mt-10 flex-1 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-9 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {pools.map((pool, i) => {
            const winnerAddr = winnerAddresses[pool.poolIdOnChain]
            const winnerName = winnerAddr
              ? winnerUsernames?.[winnerAddr] ?? `0x${winnerAddr.slice(2, 5)}…${winnerAddr.slice(-4)}`
              : null
            return (
              <PoolCard
                key={pool.id}
                pool={pool}
                index={i}
                userProfile={userProfile}
                userTier={userTier}
                mcBalanceNum={mcBalanceNum}
                isJoinedThisCycle={joinedFlags[pool.poolIdOnChain]}
                cycleId={
                  (() => {
                    const cyc = resultOf<bigint>(cycles[pool.poolIdOnChain])
                    return typeof cyc === 'bigint' ? Number(cyc) : undefined
                  })()
                }
                needsApproval={allowanceNum < pool.contributionAmount}
                lastWinnerName={winnerName}
                isJoiningThis={joiningPoolId === pool.id}
                isJoinPending={joinWrite.isPending}
                isApprovePending={approveWrite.isPending}
                onJoin={handleJoinPool}
                onApprove={handleApprove}                onOpenRegister={openRegister}
              />
            )
          })}
        </div>
      )}

      {/* Auto-settle info (menggantikan tombol settle manual — pool menutup otomatis saat penuh) */}
      <div className="glass-panel glass-panel-hover rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3E63FF]/10 border border-[#3e63FF]/30 flex items-center justify-center shrink-0">
            <Icon name="autorenew" className="text-xl text-[#3E63FF]" />
          </div>
          <div>
            <p className="font-mono-label text-mono-label text-[#3E63FF] uppercase">Auto-Settle</p>
            <h3 className="font-body-md text-body-md text-on-surface font-semibold mt-0.5">
              Siklus berjalan otomatis
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-1 max-w-md leading-relaxed">
              Saat kapasitas pool terpenuhi, kontrak langsung mengocok pemenang, mengirim hadiah,
              dan pindah ke siklus berikutnya — tanpa perantara.
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-[#3e63ff]/30 bg-[#10131A]/60 px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-[#3E63FF] animate-pulse shadow-[0_0_8px_rgba(62,99,255,0.9)]" />
          <span className="font-mono-label text-mono-label text-[#3E63FF] uppercase">Keeper Ready</span>
        </span>
      </div>
    </>
  )
}