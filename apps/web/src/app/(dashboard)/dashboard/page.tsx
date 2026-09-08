'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSignMessage,
  usePublicClient,
} from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { getSessionAuthHeaders } from '@/lib/wallet-auth-client'
import { calculateTier } from '@/lib/tier'
import { requestPushPermission, sendBrowserNotification } from '@/lib/push-notifications'
import { parseTxError } from '@/lib/use-transaction'

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
  poolId?: string
  approveForPoolId?: string
  contributeForPoolId?: string
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
  const publicClient = usePublicClient()

  const [interactedPoolId, setInteractedPoolId] = useState<string | null>(null)
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
    queryKey: ['pools', address],
    queryFn: async () => {
      const url = address ? `/api/pools?address=${address}` : '/api/pools'
      const res = await fetch(url)
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
      totalMembers: (db as unknown as { totalMembers?: number })?.totalMembers ?? 0,
      activeGroups: (db as unknown as { activeGroups?: number })?.activeGroups ?? 0,
      isPoolMember: (db as unknown as { isUserMember?: boolean })?.isUserMember ?? false,
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
    query: { enabled: !!address, refetchInterval: 10_000 },
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

  // ---- MeritPool Multi-Cohort: status/round/cycle/deadline/cohortId/activeGroups per pool ----
  const statesRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'getPoolState' as const,
      args: [BigInt(cfg.poolIdOnChain), (address ?? ZERO_ADDRESS) as `0x${string}`],
    })),
  })
  type PoolStateTuple = [number, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
  const poolStates = POOL_REGISTRY.map((cfg) => {
    const r = resultOf<PoolStateTuple>(statesRead.data?.[cfg.poolIdOnChain])
    if (!r) return undefined
    return {
      status: Number(r[0]),
      round: Number(r[1]),
      cycle: Number(r[2]),
      deadlineSec: Number(r[3]),
      collected: Number(r[4]) / 1e18,
      memberCount: Number(r[5]),
      cohortId: Number(r[6]),
      activeGroups: Number(r[7]),
    }
  })

  // currentCycle per pool
  const cyclesRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'currentCycle',
      args: [BigInt(cfg.poolIdOnChain)],
    })),
  })
  const cycles = cyclesRead.data ?? []

  // hasContributed[poolId][cohortId][cycleId][user]
  const joinedRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => {
      const pState = poolStates[cfg.poolIdOnChain]
      return {
        address: MERITPOOL_ADDRESS as `0x${string}`,
        abi: MERITPOOL_ABI,
        functionName: 'hasContributed',
        args: [
          BigInt(cfg.poolIdOnChain),
          BigInt(pState?.cohortId ?? 1),
          BigInt(pState?.cycle ?? 1),
          (address ?? ZERO_ADDRESS) as `0x${string}`,
        ],
      }
    }),
    query: { enabled: !!address },
  })
  const joinedFlags = joinedRead.data?.map((r) => resultOf<boolean>(r) === true) ?? []

  // Baca cohort aktif per pool untuk user aktif (0 jika tidak terdaftar / tuntas)
  const userCohortsRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'userCohort',
      args: [(address ?? ZERO_ADDRESS) as `0x${string}`, BigInt(cfg.poolIdOnChain)],
    })),
    query: { enabled: !!address },
  })
  const userCohortNumbers = POOL_REGISTRY.map((cfg) => {
    const val = resultOf<bigint>(userCohortsRead.data?.[cfg.poolIdOnChain])
    return typeof val === 'bigint' ? Number(val) : 0
  })

  // Baca ID cohort pembentukan terbaru (currentCohort)
  const currentCohortsRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'currentCohort',
      args: [BigInt(cfg.poolIdOnChain)],
    })),
  })
  const currentCohortIds = POOL_REGISTRY.map((cfg) => {
    const val = resultOf<bigint>(currentCohortsRead.data?.[cfg.poolIdOnChain])
    return typeof val === 'bigint' ? val : BigInt(1)
  })

  // Baca cohort state dari currentCohort (forming cohort untuk outsider)
  const formingStatesRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg, i) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'getCohortState' as const,
      args: [BigInt(cfg.poolIdOnChain), currentCohortIds[i]],
    })),
  })
  type CohortStateTuple = [number, bigint, bigint, bigint, bigint, bigint]
  const formingMemberCounts = POOL_REGISTRY.map((cfg, i) => {
    const r = resultOf<CohortStateTuple>(formingStatesRead.data?.[i])
    return r ? Number(r[5]) : 0
  })

  // Settleable per pool (deadline tercapai atau semua anggota sudah bayar)
  const settleableRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'isSettleable' as const,
      args: [BigInt(cfg.poolIdOnChain)],
    })),
  })

  // ---- Auction data (Tier 4-5) ----
  const minBidRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => ({
      address: MERITPOOL_ADDRESS as `0x${string}`,
      abi: MERITPOOL_ABI,
      functionName: 'minValidBid' as const,
      args: [BigInt(cfg.poolIdOnChain)],
    })),
  })
  const lowestBidRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => {
      const pState = poolStates[cfg.poolIdOnChain]
      const cohortId = BigInt(pState?.cohortId && pState.cohortId > 0 ? pState.cohortId : (currentCohortIds[cfg.poolIdOnChain] ?? 1))
      return {
        address: MERITPOOL_ADDRESS as `0x${string}`,
        abi: MERITPOOL_ABI,
        functionName: 'getLowestBid' as const,
        args: [BigInt(cfg.poolIdOnChain), cohortId],
      }
    }),
  })
  const bidCountRead = useReadContracts({
    contracts: POOL_REGISTRY.map((cfg) => {
      const pState = poolStates[cfg.poolIdOnChain]
      const cohortId = BigInt(pState?.cohortId && pState.cohortId > 0 ? pState.cohortId : (currentCohortIds[cfg.poolIdOnChain] ?? 1))
      return {
        address: MERITPOOL_ADDRESS as `0x${string}`,
        abi: MERITPOOL_ABI,
        functionName: 'getBidCount' as const,
        args: [BigInt(cfg.poolIdOnChain), cohortId],
      }
    }),
  })

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
  const queryClient = useQueryClient()
  const [processingPoolId, setProcessingPoolId] = useState<string | null>(null)
  const [processingStage, setProcessingStage] = useState<string | null>(null)
  const [processingLabel, setProcessingLabel] = useState<string | null>(null)

  // ---------- Handlers dengan Optimistic UI & Konfirmasi 1-Block Cepat ----------
  const handleJoinPool = async (poolId: string) => {
    if (!address) {
      toast('error', 'Wallet belum terhubung', 'Sambungkan wallet Anda terlebih dahulu.')
      return
    }
    const pool = pools.find((p) => p.id === poolId)
    if (!pool) return

    setInteractedPoolId(poolId)
    setJoiningPoolId(poolId)
    setProcessingPoolId(poolId)

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

      // 2. Jika allowance kurang, lakukan approve terlebih dahulu
      if (currentAllowanceNum < pool.contributionAmount) {
        setProcessingStage('approving')
        setProcessingLabel('Menyetujui di Dompet…')
        toast('info', 'Menyetujui Token MC…', 'Konfirmasi persetujuan token MC di dompet Anda.')

        const approveAmount = parseUnits('1000000', 18)
        const approveHash = await approveWrite.writeContractAsync({
          address: MCIRCLE_ADDRESS,
          abi: MCIRCLE_ABI,
          functionName: 'approve',
          args: [MERITPOOL_ADDRESS, approveAmount],
        })

        setProcessingStage('waiting_approve')
        setProcessingLabel('Mengonfirmasi Persetujuan…')

        if (publicClient) {
          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveHash,
            confirmations: 1,
          })
          if (approveReceipt.status === 'reverted') {
            throw new Error('Persetujuan token gagal di blockchain.')
          }
        }
        toast('success', 'Token Disetujui!', 'Melanjutkan pendaftaran ke pool arisan…')
        refetchAllowance()
      }

      // 3. Ambil signature backend
      setProcessingStage('signing')
      setProcessingLabel('Memverifikasi Izin…')
      const res = await fetch('/api/pools/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, poolId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gabung pool ditolak oleh server')
      }

      // 4. Eksekusi joinPool on-chain
      setProcessingStage('joining')
      setProcessingLabel('Konfirmasi Join di Dompet…')
      const joinHash = await joinWrite.writeContractAsync({
        address: MERITPOOL_ADDRESS,
        abi: MERITPOOL_ABI,
        functionName: 'joinPool',
        args: [BigInt(pool.poolIdOnChain), BigInt(data.userTier as number), data.signature as `0x${string}`],
      })

      setProcessingStage('waiting_join')
      setProcessingLabel('Mendaftarkan di Blockchain…')
      if (publicClient) {
        const joinReceipt = await publicClient.waitForTransactionReceipt({
          hash: joinHash,
          confirmations: 1,
        })
        if (joinReceipt.status === 'reverted') {
          throw new Error('Pendaftaran arisan gagal di blockchain.')
        }
      }

      // 5. Catat off-chain
      const authHeaders = await getSessionAuthHeaders(address, signMessageAsync)
      await fetch('/api/pools/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ poolId }),
      }).catch(() => undefined)

      toast('success', `Berhasil Masuk ${pool.name}!`, 'Anda telah terdaftar di arisan.', joinHash)
      sendBrowserNotification(`✅ Bergabung di ${pool.name}`, 'Anda telah berhasil mendaftar ke arisan.')

      // 6. Refresh state instan
      await queryClient.invalidateQueries()
      refetchBalance()
      refetchPools()
      refetchAllowance()
      refetchWinners()
      statesRead.refetch()
      cyclesRead.refetch()
      joinedRead.refetch()

      // Trigger auto-settle jika kelompok penuh
      fetch('/api/pools/auto-settle', { method: 'POST' }).catch(() => undefined)
    } catch (error) {
      const msg = parseTxError(error)
      if (msg.includes('dibatalkan')) {
        toast('info', 'Pendaftaran Dibatalkan', msg)
      } else {
        toast('error', 'Gagal Bergabung', msg)
      }
    } finally {
      setProcessingPoolId(null)
      setProcessingStage(null)
      setProcessingLabel(null)
      setInteractedPoolId(null)
      setJoiningPoolId(null)
    }
  }

  const handleApprove = async (poolId: string, amount: number) => {
    try {
      setInteractedPoolId(poolId)
      setJoiningPoolId(poolId)
      setProcessingPoolId(poolId)
      setProcessingStage('approving')
      setProcessingLabel('Menyetujui di Dompet…')

      const targetPool = pools.find((p) => p.id === poolId)
      const exactAmount = targetPool?.contributionAmount ?? amount
      const amountInWei = parseUnits(exactAmount.toString(), 18)
      const hash = await approveWrite.writeContractAsync({
        address: MCIRCLE_ADDRESS,
        abi: MCIRCLE_ABI,
        functionName: 'approve',
        args: [MERITPOOL_ADDRESS, amountInWei],
      })

      setProcessingStage('waiting_approve')
      setProcessingLabel('Mengonfirmasi Persetujuan…')
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
      }

      toast('success', 'Persetujuan Berhasil', `Izin penarikan ${exactAmount} MC telah aktif.`, hash)
      refetchAllowance()
    } catch (error) {
      const msg = parseTxError(error)
      toast(msg.includes('dibatalkan') ? 'info' : 'error', 'Approve Token', msg)
    } finally {
      setProcessingPoolId(null)
      setProcessingStage(null)
      setProcessingLabel(null)
      setInteractedPoolId(null)
      setJoiningPoolId(null)
    }
  }

  const handleContribute = async (poolId: string) => {
    if (!address) return
    const pool = pools.find((p) => p.id === poolId)
    if (!pool) return

    setInteractedPoolId(poolId)
    setJoiningPoolId(poolId)
    setProcessingPoolId(poolId)

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
        toast('info', 'Menyetujui Token MC…', 'Konfirmasi persetujuan token MC di dompet Anda.')

        const approveAmount = parseUnits('1000000', 18)
        const approveHash = await approveWrite.writeContractAsync({
          address: MCIRCLE_ADDRESS,
          abi: MCIRCLE_ABI,
          functionName: 'approve',
          args: [MERITPOOL_ADDRESS, approveAmount],
        })

        setProcessingStage('waiting_approve')
        setProcessingLabel('Mengonfirmasi Persetujuan…')
        if (publicClient) {
          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveHash,
            confirmations: 1,
          })
          if (approveReceipt.status === 'reverted') {
            throw new Error('Persetujuan token gagal di blockchain.')
          }
        }
        refetchAllowance()
      }

      // 2. Eksekusi contribute
      setProcessingStage('contributing')
      setProcessingLabel('Konfirmasi Iuran di Dompet…')
      const hash = await joinWrite.writeContractAsync({
        address: MERITPOOL_ADDRESS,
        abi: MERITPOOL_ABI,
        functionName: 'contribute',
        args: [BigInt(pool.poolIdOnChain)],
      })

      setProcessingStage('waiting_contribute')
      setProcessingLabel('Mengonfirmasi Pembayaran Iuran…')
      if (publicClient) {
        const contributeReceipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        })
        if (contributeReceipt.status === 'reverted') {
          throw new Error('Pembayaran iuran gagal di blockchain.')
        }
      }

      toast('success', `Iuran ${pool.name} Berhasil Dibayar!`, `Pembayaran ${pool.contributionAmount} MC sukses.`, hash)
      sendBrowserNotification(`💳 Iuran ${pool.name} Dibayar`, `Pembayaran iuran sebesar ${pool.contributionAmount} MC berhasil dikirim.`)

      await queryClient.invalidateQueries()
      refetchBalance()
      refetchPools()
      refetchAllowance()
      statesRead.refetch()
      cyclesRead.refetch()
      joinedRead.refetch()

      // Trigger auto-settle
      fetch('/api/pools/auto-settle', { method: 'POST' }).catch(() => undefined)
    } catch (error) {
      const msg = parseTxError(error)
      if (msg.includes('dibatalkan')) {
        toast('info', 'Pembayaran Dibatalkan', msg)
      } else {
        toast('error', 'Pembayaran Iuran Gagal', msg)
      }
    } finally {
      setProcessingPoolId(null)
      setProcessingStage(null)
      setProcessingLabel(null)
      setInteractedPoolId(null)
      setJoiningPoolId(null)
    }
  }

  const handleBid = async (poolId: string, amountMc: number) => {
    if (!address) return
    const pool = pools.find((p) => p.id === poolId)
    if (!pool) return

    setInteractedPoolId(poolId)
    setJoiningPoolId(poolId)
    setProcessingPoolId(poolId)

    try {
      setProcessingStage('bidding')
      setProcessingLabel('Konfirmasi Bid di Dompet…')
      const hash = await joinWrite.writeContractAsync({
        address: MERITPOOL_ADDRESS,
        abi: MERITPOOL_ABI,
        functionName: 'placeBid',
        args: [BigInt(pool.poolIdOnChain), parseUnits(amountMc.toString(), 18)],
      })

      setProcessingStage('waiting_bid')
      setProcessingLabel('Mencatat Bid di Blockchain…')
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
      }

      toast('success', 'Bid Lelang Tercatat!', `Tawaran payout ${amountMc.toLocaleString()} MC telah dipasang.`, hash)
      await queryClient.invalidateQueries()
    } catch (error) {
      const msg = parseTxError(error)
      toast(msg.includes('dibatalkan') ? 'info' : 'error', 'Pemasangan Bid', msg)
    } finally {
      setProcessingPoolId(null)
      setProcessingStage(null)
      setProcessingLabel(null)
      setInteractedPoolId(null)
      setJoiningPoolId(null)
    }
  }

  // Keeper background auto-settle
  useEffect(() => {
    requestPushPermission().catch(() => undefined)

    const triggerAutoSettle = async () => {
      try {
        const res = await fetch('/api/pools/auto-settle', { method: 'POST' })
        if (res.ok) {
          const data = await res.json()
          if (data.results?.length) {
            await queryClient.invalidateQueries()
            refetchPools()
            refetchWinners()
            refetchBalance()
            refetchAllowance()
            statesRead.refetch()
            winnersRead.refetch()
            cyclesRead.refetch()
            joinedRead.refetch()
            userCohortsRead.refetch()
            currentCohortsRead.refetch()
            formingStatesRead.refetch()
            toast('success', '🏆 Pemenang Arisan Terpilih!', 'Undian arisan siklus selesai dan hadiah telah ditransfer langsung di on-chain.')
            for (const _r of data.results) {
              sendBrowserNotification(
                '🏆 Pemenang Arisan Terpilih!',
                'Undian arisan telah selesai dan hadiah telah ditransfer langsung on-chain.'
              )
            }
          }
        }
      } catch {
        // silent background
      }
    }

    const interval = setInterval(triggerAutoSettle, 6_000)
    triggerAutoSettle()
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- Derived ----------
  const userTier = userProfile ? calculateTier(userProfile.meritScore) : 0

  // User's active pool lock-in: hanya terkunci jika memiliki cohort aktif di on-chain
  const activeJoinedPool = useMemo(() => {
    const onChainIdx = userCohortNumbers.findIndex((c) => c > 0)
    if (onChainIdx >= 0) {
      return pools[onChainIdx] ?? null
    }
    return null
  }, [userCohortNumbers, pools])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface tracking-tighter">
            Available Pools
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Gabung arisan on-chain — kontribusi, hadiah, dan pemenang tiap siklus.
          </p>
        </div>
      </header>

      {pools.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[460px] rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {pools.map((pool, i) => {
            const winnerAddr = winnerAddresses[pool.poolIdOnChain]
            const winnerName = winnerAddr
              ? winnerUsernames?.[winnerAddr] ?? `0x${winnerAddr.slice(2, 5)}…${winnerAddr.slice(-4)}`
              : null
            const isOtherInteracted = interactedPoolId !== null && interactedPoolId !== pool.id
            const isPendingThis = joiningPoolId === pool.id || pendingReceipt?.poolId === pool.id || pendingReceipt?.approveForPoolId === pool.id || pendingReceipt?.contributeForPoolId === pool.id
            const lockedInOtherPoolName = activeJoinedPool && activeJoinedPool.id !== pool.id ? activeJoinedPool.name : null

            return (
              <PoolCard
                key={pool.id}
                pool={pool}
                index={i}
                userProfile={userProfile}
                userTier={userTier}
                mcBalanceNum={mcBalanceNum}
                isJoinedThisCycle={joinedFlags[pool.poolIdOnChain]}
                cycleId={poolStates[pool.poolIdOnChain]?.cycle ?? 1}
                needsApproval={isOtherInteracted ? true : allowanceNum < pool.contributionAmount}
                lastWinnerName={winnerName}
                isJoiningThis={isPendingThis}
                isJoinPending={joinWrite.isPending && isPendingThis}
                isApprovePending={approveWrite.isPending && isPendingThis}
                onJoin={handleJoinPool}
                onApprove={handleApprove}
                onOpenRegister={openRegister}
                isOtherInteracted={isOtherInteracted}
                lockedInOtherPoolName={lockedInOtherPoolName}
                // ---- Multi-Cohort v3 ----
                poolStatus={poolStates[pool.poolIdOnChain]?.status}
                deadlineSec={poolStates[pool.poolIdOnChain]?.deadlineSec}
                isPoolMember={!!userProfile?.memberPoolIds?.includes(pool.id) || !!(pool as unknown as { isPoolMember?: boolean })?.isPoolMember}
                isContributePending={joinWrite.isPending && isPendingThis}
                onContribute={handleContribute}
                minBidNum={
                  (() => {
                    const v = resultOf<bigint>(minBidRead.data?.[pool.poolIdOnChain])
                    return typeof v === 'bigint' ? Number(v) / 1e18 : undefined
                  })()
                }
                lowestBid={
                  (() => {
                    const r = resultOf<[string, bigint]>(lowestBidRead.data?.[pool.poolIdOnChain])
                    if (!r || typeof r[1] !== 'bigint' || r[1] === BigInt(0)) return null
                    return { bidder: r[0], amount: (Number(r[1]) / 1e18).toString() }
                  })()
                }
                bidCount={
                  (() => {
                    const v = resultOf<bigint>(bidCountRead.data?.[pool.poolIdOnChain])
                    return typeof v === 'bigint' ? Number(v) : 0
                  })()
                }
                isBidPending={joinWrite.isPending && isPendingThis}
                onBid={handleBid}
                processingStage={processingPoolId === pool.id ? processingStage : null}
                processingLabel={processingPoolId === pool.id ? processingLabel : null}
                userCohortNum={userCohortNumbers[pool.poolIdOnChain]}
                formingMembersCount={formingMemberCounts[pool.poolIdOnChain]}
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
    </div>
  )
}