'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import { Icon } from './Icon'
import TierBadge from './TierBadge'
import type { UserProfile } from './Sidebar'

export type Pool = {
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

type LowestBid = { bidder: string; amount: string } | null

type PoolCardProps = {
  pool: Pool
  index: number
  userProfile: UserProfile | null | undefined
  userTier: number
  mcBalanceNum: number
  isJoinedThisCycle: boolean | undefined
  cycleId: number | undefined
  needsApproval: boolean
  lastWinnerName: string | null | undefined
  isJoiningThis: boolean
  isJoinPending: boolean
  isApprovePending: boolean
  onJoin: (poolId: string) => void
  onApprove: (poolId: string, amount: number) => void
  onOpenRegister: () => void
  // ---- MeritPool v2 ----
  poolStatus?: number // 0 OPEN · 1 ACTIVE · 2 COMPLETED
  deadlineSec?: number // unix detik — deadline cycle berjalan
  isPoolMember?: boolean
  isContributePending?: boolean
  onContribute?: (poolId: string) => void
  minBidNum?: number // MC — batas bawah bid valid
  lowestBid?: LowestBid
  bidCount?: number
  isBidPending?: boolean
  onBid?: (poolId: string, amountMc: number) => void
  settleable?: boolean
  isSettlingThis?: boolean
  onSettle?: (poolId: string) => void
}

const STATUS_LABELS = ['Open', 'Active', 'Completed'] as const

function formatCountdown(deadlineSec?: number): string | null {
  if (!deadlineSec) return null
  const remaining = deadlineSec - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return 'Deadline tercapai'
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  return mins > 0 ? `${mins}m ${secs}s lagi` : `${secs}s lagi`
}

// Backdrop artistik per tier (berbasis gradient + glow)
const TIER_BACKDROPS = [
  'radial-gradient(120% 90% at 20% 0%, rgba(160,141,132,0.35), transparent 55%), linear-gradient(160deg, #23262a, #121414)',
  'radial-gradient(120% 90% at 20% 0%, rgba(217,142,74,0.40), transparent 55%), linear-gradient(160deg, #2a2117, #121414)',
  'radial-gradient(120% 90% at 20% 0%, rgba(96,165,250,0.40), transparent 55%), linear-gradient(160deg, #1a2333, #121414)',
  'radial-gradient(120% 90% at 20% 0%, rgba(255,200,87,0.40), transparent 55%), linear-gradient(160deg, #2a2416, #121414)',
  'radial-gradient(120% 90% at 20% 0%, rgba(79,131,255,0.45), transparent 55%), linear-gradient(160deg, #16203d, #121414)',
  'radial-gradient(120% 90% at 20% 0%, rgba(255,176,32,0.45), transparent 55%), linear-gradient(160deg, #2a1622, #121414)',
]

export default function PoolCard({
  pool,
  index,
  userProfile,
  userTier,
  mcBalanceNum,
  isJoinedThisCycle,
  cycleId,
  needsApproval,
  lastWinnerName,
  isJoiningThis,
  isJoinPending,
  isApprovePending,
  onJoin,
  onApprove,
  onOpenRegister,
  poolStatus,
  deadlineSec,
  isPoolMember,
  isContributePending,
  onContribute,
  minBidNum,
  lowestBid,
  bidCount,
  isBidPending,
  onBid,
  settleable,
  isSettlingThis,
  onSettle,
}: PoolCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [tiltStyle, setTiltStyle] = React.useState<React.CSSProperties>({})
  // Tick tiap 30 detik agar countdown ter-refresh
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
  const [bidInput, setBidInput] = React.useState('')

  // --- MOUSE MOVE HANDLER (3D Tilt) ---
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const { left, top, width, height } = cardRef.current.getBoundingClientRect()
    const x = e.clientX - left
    const y = e.clientY - top
    const rotateX = ((y - height / 2) / (height / 2)) * -8
    const rotateY = ((x - width / 2) / (width / 2)) * 8
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
      transition: 'transform 0.1s ease-out',
    })
  }

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.4s ease-in-out',
    })
  }

  // --- ATURAN LOCK: userTier >= pool.tierRequired (murni, tanpa asumsi lain) ---
  const isTierEligible = userTier >= pool.tierRequired
  const isVIPEligible = pool.isAuctionMode ? (userProfile?.isVerified ?? false) : true
  const hasEnoughBalance = mcBalanceNum >= pool.contributionAmount
  const poolFull = pool.memberCount >= pool.poolSize

  const isJoined = !!userProfile && !!isJoinedThisCycle
  const isLocked = !!userProfile && !isJoined && (!isTierEligible || !isVIPEligible || !hasEnoughBalance || poolFull)

  const capacityPct = Math.min(100, (pool.memberCount / pool.poolSize) * 100)
  const anyStepPending = isApprovePending || isJoinPending || isJoiningThis

  const lockReason = poolFull
    ? 'Pool Penuh'
    : !isTierEligible
      ? `Butuh Tier ${pool.tierRequired} (Anda Tier ${userTier})`
      : !isVIPEligible
        ? 'Requires VIP Status'
        : 'Insufficient Balance'

  const isCompleted = poolStatus === 2
  const isOpen = poolStatus === undefined || poolStatus === 0

  const statusChip = isCompleted ? (
    <span className="flex items-center gap-1 rounded-full border border-white/15 bg-[#10131A]/60 px-2 py-1 backdrop-blur-sm">
      <Icon name="flag_circle" className="text-sm text-[#C3C6D3]" />
      <span className="font-mono-label text-mono-label text-[#C3C6D3] uppercase">Selesai</span>
    </span>
  ) : isJoined ? (
    <span className="flex items-center gap-1 rounded-full border border-secondary-fixed/50 bg-secondary-fixed/10 px-2 py-1 backdrop-blur-sm">
      <Icon name="check_circle" fill className="text-sm text-secondary-fixed" />
      <span className="font-mono-label text-mono-label text-secondary-fixed uppercase">
        Cycle {cycleId ?? '—'} · Member
      </span>
    </span>
  ) : isLocked ? (
    <span className="flex items-center gap-1 rounded-full border border-[#3e63ff]/20 bg-[#10131A]/60 px-2 py-1 backdrop-blur-sm">
      <Icon name="lock" className="text-sm text-[#C3C6D3]" />
      <span className="font-mono-label text-mono-label text-[#C3C6D3] uppercase">Locked</span>
    </span>
  ) : (
    <span className="flex items-center gap-1.5 rounded-full border border-[#3e63ff]/30 bg-[#10131A]/60 px-2 py-1 backdrop-blur-sm">
      <span className="w-2 h-2 rounded-full bg-[#3E63FF] animate-pulse shadow-[0_0_8px_rgba(62,99,255,0.9)]" />
      <span className="font-mono-label text-mono-label text-[#3E63FF] uppercase">
        {isOpen ? 'Live' : 'Aktif'}
      </span>
    </span>
  )

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      initial={{ opacity: 0, filter: 'blur(6px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.45, delay: 0.05 * index }}
      className={cn(
        'group relative w-full max-w-[320px] rounded-3xl bg-[#1d2027]/60 border border-[#3e63ff]/30 backdrop-blur-[12px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] transform-style-3d will-change-transform',
        pool.isAuctionMode ? 'h-[640px]' : 'h-[530px]',
        'transition-all duration-300 hover:border-[#3e63ff]/60 hover:shadow-[0px_25px_60px_-12px_rgba(62,99,255,0.25)]',
        isLocked && 'opacity-75 grayscale-[0.45] hover:opacity-100 hover:grayscale-0',
        isJoined && 'border-[#56ffa8]/40 shadow-[0px_25px_50px_-12px_rgba(0,236,145,0.15)]'
      )}
    >
      {/* Decorative corner dots */}
      <span className="absolute left-2.5 top-2.5 w-1 h-1 rounded-full bg-[#3E63FF]/50 z-20" />
      <span className="absolute right-2.5 top-2.5 w-1 h-1 rounded-full bg-[#3E63FF]/50 z-20" />
      <span className="absolute left-2.5 bottom-2.5 w-1 h-1 rounded-full bg-[#3E63FF]/50 z-20" />
      <span className="absolute right-2.5 bottom-2.5 w-1 h-1 rounded-full bg-[#3E63FF]/50 z-20" />

      {/* Tier accent */}
      <div
        className="absolute inset-0 h-full w-full rounded-3xl opacity-20 transition-opacity duration-300 group-hover:opacity-35"
        style={{ background: TIER_BACKDROPS[Math.min(Math.max(pool.tierRequired, 0), 5)], transform: 'translateZ(-20px) scale(1.1)' }}
      />
      <div className="absolute inset-0 dot-grid opacity-20 rounded-3xl" style={{ transform: 'translateZ(-20px) scale(1.1)' }} />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#10131A]/95 via-[#10131A]/30 to-transparent rounded-3xl" />

      {/* Main Content */}
      <div className="absolute inset-0 p-4 flex flex-col" style={{ transform: 'translateZ(30px)' }}>
        {/* Status chip */}
        <div className="absolute top-4 right-4 z-20">{statusChip}</div>

        {/* Glassmorphism Header */}
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#3e63ff]/20 bg-[#10131A]/50 p-4 backdrop-blur-md">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#E2E2E9] leading-snug truncate">{pool.name}</h3>
            <p className="text-xs text-[#C3C6D3] mt-0.5 truncate">
              {isJoined ? `Requires Tier ${pool.tierRequired} · Anda Member` : `Requires Tier ${pool.tierRequired}`}
            </p>
          </div>
          <div className="shrink-0 rounded-full border border-[#3e63ff]/30 bg-[#10131A]/60 p-0.5">
            <TierBadge tier={pool.tierRequired} size="sm" />
          </div>
        </div>

        {/* Price Tag */}
        <div className="absolute top-[96px] left-4 z-10">
          <div className="rounded-full bg-[#10131A]/70 border border-[#3e63ff]/20 px-3.5 py-1.5 text-sm font-semibold text-[#E2E2E9] backdrop-blur-sm font-mono">
            {pool.contributionAmount.toLocaleString()} MC / siklus
          </div>
        </div>

        {/* Stats — ROSCA/Arisan: Prize Pool & Members */}
        <div className="mt-20 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#C3C6D3]">Prize Pool</span>
            <span className="font-semibold text-[#5B7CFF] font-mono">
              {pool.totalYield.toLocaleString()} MC
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#C3C6D3]">Members</span>
            <span className="font-semibold text-[#E2E2E9] font-mono">
              {pool.memberCount}/{pool.poolSize}
            </span>
          </div>
          <div className="pt-1">
            <div className="flex justify-between font-mono-label text-mono-label text-[10px] mb-1">
              <span className="text-[#C3C6D3]">Members</span>
              <span className="text-[#3E63FF]">{Math.round(capacityPct)}% Full</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3E63FF]/40 to-[#3E63FF] rounded-full shadow-[0_0_10px_rgba(62,99,255,0.5)] transition-all duration-700"
                style={{ width: `${capacityPct}%` }}
              />
            </div>
          </div>

          {/* Last Winner — pemenang siklus sebelumnya */}
          <div className="flex items-center gap-1.5 text-xs mt-1.5 rounded-xl border border-[#3e63ff]/15 bg-[#10131A]/50 px-3 py-2">
            <span className="text-sm">🏆</span>
            <span className="text-[#C3C6D3]">Last Winner:</span>
            <span className="font-semibold text-[#E2E2E9] truncate">
              {lastWinnerName ? `@${lastWinnerName}` : '—'}
            </span>
          </div>

          {/* Cycle & countdown (v2) */}
          {poolStatus === 1 && cycleId !== undefined && (
            <div className="flex items-center justify-between text-[11px] mt-1 px-1">
              <span className="text-[#C3C6D3] font-mono-label uppercase">Cycle {cycleId}</span>
              <span className="text-[#5B7CFF] font-mono">{formatCountdown(deadlineSec) ?? '—'}</span>
            </div>
          )}

          {/* Panel auction (v2 — hanya pool auction saat ACTIVE) */}
          {pool.isAuctionMode && poolStatus === 1 && (
            <div className="mt-1.5 rounded-xl border border-[#ffb020]/25 bg-[#10131A]/60 px-3 py-2 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#C3C6D3]">Lelang · bid terendah menang</span>
                <span className="text-[#C3C6D3] font-mono">{bidCount ?? 0} bid</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#C3C6D3]">Min bid</span>
                <span className="text-[#ffb020] font-mono">{(minBidNum ?? 0).toLocaleString()} MC</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#C3C6D3]">Bid terendah</span>
                <span className="text-[#E2E2E9] font-mono truncate max-w-[140px]">
                  {lowestBid
                    ? `${Number(lowestBid.amount).toLocaleString()} MC`
                    : 'Belum ada'}
                </span>
              </div>
              {/* Form bid: member yang sudah bayar iuran cycle ini */}
              {isPoolMember && isJoinedThisCycle && !isCompleted && onBid && (
                <div className="flex gap-1.5 pt-0.5">
                  <input
                    value={bidInput}
                    onChange={(e) => setBidInput(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder={`${minBidNum?.toFixed(0) ?? '—'}+`}
                    inputMode="decimal"
                    className="min-w-0 flex-1 rounded-lg border border-outline-variant/40 bg-surface-container/50 px-2 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const v = parseFloat(bidInput)
                      if (!Number.isFinite(v) || v <= 0) return
                      onBid(pool.id, v)
                      setBidInput('')
                    }}
                    disabled={isBidPending || !bidInput}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                      isBidPending || !bidInput
                        ? 'bg-white/10 text-white/50 cursor-not-allowed'
                        : 'bg-[#ffb020]/90 text-black hover:bg-[#ffb020]',
                    )}
                  >
                    {isBidPending ? '…' : 'Bid'}
                  </button>
                </div>
              )}
            </div>
          )}

          {isJoined && (
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-[#C3C6D3]">Your Stake</span>
              <span className="font-semibold text-[#E2E2E9] font-mono">
                {pool.contributionAmount.toLocaleString()} MC
              </span>
            </div>
          )}
        </div>

        {/* Actions — satu tombol pintar (Approve → otomatis Join) + aksi v2 */}
        <div className="mt-auto flex flex-col gap-1.5">
          {/* Bayar iuran cycle berjalan (member, cycle >= 2, belum bayar) */}
          {poolStatus === 1 && isPoolMember && !isJoinedThisCycle && onContribute && (
            <button
              onClick={() => onContribute(pool.id)}
              disabled={isContributePending}
              className={cn(
                'w-full py-2 rounded-full text-sm font-semibold transition-all duration-300',
                isContributePending
                  ? 'loading-state cursor-wait bg-[#3E63FF] text-white'
                  : 'bg-secondary-fixed/15 border border-secondary-fixed/40 text-secondary-fixed hover:bg-secondary-fixed/25',
              )}
            >
              {isContributePending ? 'Confirming…' : `Bayar Iuran ${pool.contributionAmount.toLocaleString()} MC`}
            </button>
          )}

          {/* Keeper-lite: tutup cycle saat settleable */}
          {settleable && poolStatus === 1 && onSettle && (
            <button
              onClick={() => onSettle(pool.id)}
              disabled={isSettlingThis}
              className={cn(
                'w-full py-2 rounded-full text-sm font-semibold transition-all duration-300',
                isSettlingThis
                  ? 'loading-state cursor-wait bg-[#3E63FF] text-white'
                  : 'bg-[#10131A]/70 border border-[#3e63ff]/40 text-[#E2E2E9] hover:border-[#3E63FF] hover:text-[#3E63FF]',
              )}
            >
              {isSettlingThis ? 'Menutup cycle…' : 'Tutup Cycle (Settle)'}
            </button>
          )}

          {!isCompleted && poolStatus !== 1 && (isJoined ? (
            <div className="w-full py-2.5 rounded-full bg-secondary-fixed/10 border border-secondary-fixed/30 text-secondary-fixed text-sm font-semibold text-center">
              Menunggu siklus selesai…
            </div>
          ) : !userProfile ? (
            <button
              onClick={onOpenRegister}
              className="w-full py-2.5 rounded-full bg-[#3E63FF] text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-[0px_0px_15px_rgba(62,99,255,0.4)] hover:bg-[#5B7CFF] hover:shadow-[0px_0px_25px_rgba(62,99,255,0.6)]"
            >
              <Icon name="fingerprint" className="text-lg" />
              Daftar untuk Join
            </button>
          ) : (
            <button
              onClick={() =>
                needsApproval ? onApprove(pool.id, pool.contributionAmount) : onJoin(pool.id)
              }
              disabled={isLocked || anyStepPending}
              className={cn(
                'w-full relative py-2.5 rounded-full text-sm transition-all duration-300 overflow-hidden',
                isLocked
                  ? 'bg-white/10 border border-white/15 text-white/50 cursor-not-allowed'
                  : anyStepPending
                    ? 'loading-state cursor-wait bg-[#3E63FF] text-white'
                    : needsApproval
                      ? 'bg-[#10131A]/70 border border-[#3e63ff]/40 text-[#E2E2E9] font-medium hover:border-[#3E63FF] hover:text-[#3E63FF]'
                      : 'bg-[#3E63FF] text-white font-semibold shadow-[0px_0px_15px_rgba(62,99,255,0.4)] hover:bg-[#5B7CFF] hover:shadow-[0px_0px_25px_rgba(62,99,255,0.6)]',
              )}
            >
              <span className="relative z-10 flex items-center justify-center gap-2 btn-content">
                {isLocked ? (
                  <span className="flex items-center gap-1.5">
                    <Icon name="lock" className="text-sm" />
                    {lockReason}
                  </span>
                ) : isApprovePending ? (
                  'Approving…'
                ) : isJoiningThis || isJoinPending ? (
                  'Confirming Join…'
                ) : needsApproval ? (
                  <>
                    <Icon name="shield_lock" className="text-lg" />
                    Approve to Join
                  </>
                ) : (
                  'Join Pool'
                )}
              </span>
              <span className="absolute inset-0 flex items-center justify-center opacity-0 btn-spinner bg-primary transition-opacity duration-300">
                <Icon name="progress_activity" className="text-xl animate-spin text-on-primary" />
              </span>
            </button>
          ))}
          {anyStepPending && (
            <p className="font-mono-label text-mono-label text-secondary-fixed text-center mc-pulse-soft">
              Waiting for Wallet Confirmation…
            </p>
          )}
        </div>
      </div>
    </motion.article>
  )
}