'use client'

import * as React from 'react'
import Link from 'next/link'
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
  totalMembers?: number
  activeGroups?: number
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
  // ---- Multi-Cohort v3 ----
  poolStatus?: number // 0 OPEN (FORMING) · 1 ACTIVE · 2 COMPLETED
  deadlineSec?: number // unix detik — deadline cycle berjalan
  isPoolMember?: boolean
  isContributePending?: boolean
  onContribute?: (poolId: string) => void
  minBidNum?: number // MC — batas bawah bid valid
  lowestBid?: LowestBid
  bidCount?: number
  isBidPending?: boolean
  onBid?: (poolId: string, amountMc: number) => void
  isOtherInteracted?: boolean
  lockedInOtherPoolName?: string | null
  processingStage?: string | null
  processingLabel?: string | null
  userCohortNum?: number
  formingMembersCount?: number
}

function formatCountdown(deadlineSec?: number): string | null {
  if (!deadlineSec) return null
  const remaining = deadlineSec - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return 'Deadline tercapai'
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  return mins > 0 ? `${mins}m ${secs}s lagi` : `${secs}s lagi`
}

// Backdrop artistik per tier
const TIER_BACKDROPS = [
  'radial-gradient(120% 90% at 20% 0%, rgba(160,141,132,0.3), transparent 60%), linear-gradient(160deg, #1f2329, #10131a)',
  'radial-gradient(120% 90% at 20% 0%, rgba(217,142,74,0.35), transparent 60%), linear-gradient(160deg, #261f18, #10131a)',
  'radial-gradient(120% 90% at 20% 0%, rgba(96,165,250,0.35), transparent 60%), linear-gradient(160deg, #182030, #10131a)',
  'radial-gradient(120% 90% at 20% 0%, rgba(255,200,87,0.35), transparent 60%), linear-gradient(160deg, #262116, #10131a)',
  'radial-gradient(120% 90% at 20% 0%, rgba(79,131,255,0.4), transparent 60%), linear-gradient(160deg, #161c36, #10131a)',
  'radial-gradient(120% 90% at 20% 0%, rgba(255,176,32,0.4), transparent 60%), linear-gradient(160deg, #261720, #10131a)',
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
  isOtherInteracted,
  lockedInOtherPoolName,
  processingStage,
  processingLabel,
  userCohortNum,
  formingMembersCount,
}: PoolCardProps) {
  const [bidInput, setBidInput] = React.useState('')

  const isTierEligible = userTier >= pool.tierRequired
  const isVIPEligible = !pool.isAuctionMode || (userProfile?.isVerified ?? false)
  const hasEnoughBalance = mcBalanceNum >= pool.contributionAmount
  const isLockedInOther = !!lockedInOtherPoolName

  // Keanggotaan on-chain sejati: user terdaftar di cohort jika userCohortNum > 0 DAN cohort belum COMPLETED (status !== 2)
  const isUserCohortActive = (userCohortNum !== undefined ? userCohortNum > 0 : !!isPoolMember) && poolStatus === 1
  const isUserCohortForming = (userCohortNum !== undefined ? userCohortNum > 0 : !!isPoolMember) && poolStatus === 0

  const isJoined = isUserCohortActive || isUserCohortForming
  const isActiveState = isUserCohortActive
  const isFormingState = isUserCohortForming

  // Kapasitas anggota untuk tampilan:
  // Jika user berada di cohort aktif: selalu pool.poolSize (misal 3/3)
  // Jika user di cohort forming: anggota yang sudah bergabung di cohort itu (misal 1/3 atau 2/3)
  // Jika outsider: kapasitas kelompok pembentukan saat ini (0/3, 1/3, dst.)
  const currentInstanceMembers = isActiveState
    ? pool.poolSize
    : isFormingState
      ? Math.max(1, Math.min(pool.memberCount ?? 1, pool.poolSize - 1))
      : (formingMembersCount !== undefined ? formingMembersCount : (pool.memberCount ?? 0) % pool.poolSize)

  const totalMembersCount = pool.totalMembers !== undefined ? pool.totalMembers : pool.memberCount
  const activeGroupsCount = pool.activeGroups !== undefined ? pool.activeGroups : 0

  // Progress
  const capacityPct = Math.min(100, (currentInstanceMembers / pool.poolSize) * 100)
  const cyclePct = Math.min(100, ((cycleId ?? 1) / pool.poolSize) * 100)
  const anyStepPending = Boolean(isJoiningThis && (isApprovePending || isJoinPending || isContributePending || isBidPending))

  const isLocked = !!userProfile && !isJoined && (!isTierEligible || !isVIPEligible || !hasEnoughBalance || isLockedInOther)

  const lockReason = isLockedInOther
    ? `Terkunci di ${lockedInOtherPoolName}`
    : !isTierEligible
      ? `Butuh Tier ${pool.tierRequired} (Anda Tier ${userTier})`
      : !isVIPEligible
        ? 'Butuh Verifikasi Akun'
        : 'Saldo MC Kurang'

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 * index }}
      className={cn(
        'relative w-full rounded-3xl bg-[#141720]/80 border border-[#3e63ff]/25 backdrop-blur-xl shadow-xl flex flex-col justify-between p-5 space-y-4 overflow-hidden',
        'transition-all duration-300 hover:border-[#3e63ff]/60 hover:shadow-[0px_10px_35px_-5px_rgba(62,99,255,0.2)]',
        isLocked && 'opacity-85',
        isJoined && 'border-[#56ffa8]/45 shadow-[0px_10px_35px_-5px_rgba(86,255,168,0.15)]'
      )}
    >
      {/* Background Accent Gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25 rounded-3xl"
        style={{ background: TIER_BACKDROPS[Math.min(Math.max(pool.tierRequired, 0), 5)] }}
      />

      {/* Top Header */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#E2E2E9] tracking-tight">{pool.name}</h3>
            <p className="text-xs text-[#A9C7FF]/80 mt-0.5 font-medium">
              {isJoined ? 'Anda terdaftar di pool ini' : `Reputasi minimal Tier ${pool.tierRequired}`}
            </p>
          </div>
          <div className="shrink-0 p-1 rounded-2xl bg-[#10131A]/80 border border-white/10 shadow-sm">
            <TierBadge tier={pool.tierRequired} size="sm" />
          </div>
        </div>

        {/* Info Tags Row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="rounded-full bg-[#3E63FF]/15 border border-[#3e63ff]/35 px-3 py-1 text-xs font-mono font-semibold text-[#A9C7FF]">
            {pool.contributionAmount.toLocaleString()} MC <span className="text-[10px] text-[#A9C7FF]/70 font-normal">/ siklus</span>
          </div>
          <div className="rounded-full bg-white/5 border border-white/15 px-3 py-1 text-xs font-mono text-[#E2E2E9]">
            {activeGroupsCount} Kelompok Aktif
          </div>
        </div>

        {/* Status Indicator Bar */}
        <div className="pt-1">
          {isJoined ? (
            isActiveState ? (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#56ffa8]/10 border border-[#56ffa8]/30">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#56ffa8]">
                  <span className="w-2 h-2 rounded-full bg-[#56ffa8] animate-pulse shadow-[0_0_8px_rgba(86,255,168,0.9)]" />
                  Sedang Berjalan (Active)
                </span>
                <span className="text-xs font-mono font-bold text-[#56ffa8]">
                  Siklus {cycleId ?? 1} / {pool.poolSize}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#FFC857]/10 border border-[#FFC857]/30">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#FFC857]">
                  <Icon name="lock" className="text-xs" />
                  Terdaftar (Menunggu Kuota Penuh)
                </span>
                <span className="text-xs font-mono font-bold text-[#FFC857]">
                  {currentInstanceMembers} / {pool.poolSize}
                </span>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#C3C6D3]">
                <span className="w-2 h-2 rounded-full bg-[#FFC857]" />
                Menunggu Anggota
              </span>
              <span className="text-xs font-mono font-semibold text-[#FFC857]">
                {currentInstanceMembers} / {pool.poolSize} Kuota
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress & Financial Stats */}
      <div className="relative z-10 space-y-2.5 py-1">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#C3C6D3]">
              {isActiveState ? 'Progres Siklus' : 'Kapasitas Anggota'}
            </span>
            <span className="font-mono text-xs font-semibold text-[#E2E2E9]">
              {isActiveState
                ? `Siklus ${cycleId ?? 1} dari ${pool.poolSize}`
                : `${currentInstanceMembers} dari ${pool.poolSize} Anggota`}
            </span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                isActiveState
                  ? 'bg-gradient-to-r from-[#56ffa8]/50 to-[#56ffa8] shadow-[0_0_10px_rgba(86,255,168,0.5)]'
                  : 'bg-gradient-to-r from-[#FFC857]/50 to-[#FFC857] shadow-[0_0_10px_rgba(255,200,87,0.5)]'
              )}
              style={{ width: `${isActiveState ? cyclePct : capacityPct}%` }}
            />
          </div>
          {!isActiveState && (
            <p className="text-[10px] text-[#A9C7FF]/60 mt-1 italic">
              *Arisan dimulai otomatis setelah kelompok terisi {pool.poolSize} orang
            </p>
          )}
        </div>

        {/* Prize Pool Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#10131A]/60 border border-white/5">
          <span className="text-xs text-[#C3C6D3] font-medium">Total Hadiah (Prize Pool)</span>
          <span className="text-base font-bold font-mono text-[#5B7CFF]">
            {pool.totalYield.toLocaleString()} MC
          </span>
        </div>

        {/* Pemenang Siklus Sebelumnya */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-[#C3C6D3] flex items-center gap-1">
            <span>🏆</span> Pemenang Terakhir
          </span>
          <span className="font-mono font-medium text-[#E2E2E9]">
            {lastWinnerName ? `@${lastWinnerName}` : 'Belum ada'}
          </span>
        </div>

        {/* Countdown jika ACTIVE */}
        {isActiveState && deadlineSec && (
          <div className="flex items-center justify-between text-xs px-1 pt-0.5">
            <span className="text-[#C3C6D3] flex items-center gap-1">
              <Icon name="timer" className="text-xs text-[#3E63FF]" /> Batas Waktu Siklus
            </span>
            <span className="font-mono text-[#3E63FF] font-semibold">
              {formatCountdown(deadlineSec)}
            </span>
          </div>
        )}

        {/* Lelang jika mode auction */}
        {pool.isAuctionMode && isActiveState && (
          <div className="rounded-xl border border-[#ffb020]/25 bg-[#10131A]/70 p-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#ffb020] font-semibold">Mode Lelang Diskon</span>
              <span className="font-mono text-[#C3C6D3]">{bidCount ?? 0} Bid Masuk</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#C3C6D3]">Bid Terendah:</span>
              <span className="font-mono font-semibold text-[#E2E2E9]">
                {lowestBid ? `${Number(lowestBid.amount).toLocaleString()} MC` : 'Belum Ada'}
              </span>
            </div>
            {isPoolMember && isJoinedThisCycle && onBid && (
              <div className="flex gap-1.5 pt-1">
                <input
                  value={bidInput}
                  onChange={(e) => setBidInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder={`Min ${minBidNum?.toFixed(0) ?? 0}`}
                  inputMode="decimal"
                  className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#ffb020]"
                />
                <button
                  onClick={() => {
                    const v = parseFloat(bidInput)
                    if (!Number.isFinite(v) || v <= 0) return
                    onBid(pool.id, v)
                    setBidInput('')
                  }}
                  disabled={isBidPending || !bidInput}
                  className="rounded-lg bg-[#ffb020] px-3 py-1 text-xs font-bold text-black hover:bg-[#ffca66] transition-all disabled:opacity-50"
                >
                  {isBidPending ? '…' : 'Bid'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button Area */}
      <div className="relative z-10 space-y-2 pt-2 border-t border-white/10">
        {isActiveState ? (
          !isJoinedThisCycle ? (
            <button
              onClick={() => (onContribute ? onContribute(pool.id) : onJoin(pool.id))}
              disabled={isContributePending || isOtherInteracted || !!processingStage}
              className={cn(
                "w-full py-3 rounded-2xl text-black text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(86,255,168,0.35)] active:scale-[0.98]",
                processingStage
                  ? "bg-[#56ffa8]/70 cursor-wait"
                  : "bg-[#56ffa8] hover:bg-[#7affbf]"
              )}
            >
              {processingStage && isJoiningThis ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  {processingLabel || 'Memproses Iuran…'}
                </>
              ) : isContributePending ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  Membayar Iuran…
                </>
              ) : (
                <>
                  <Icon name="payments" className="text-lg" />
                  Bayar Iuran ({pool.contributionAmount} MC)
                </>
              )}
            </button>
          ) : (
            <div className="w-full py-3 rounded-2xl bg-[#56ffa8]/10 border border-[#56ffa8]/30 text-[#56ffa8] text-xs font-bold text-center flex items-center justify-center gap-1.5">
              <Icon name="check_circle" className="text-sm" />
              Iuran Siklus {cycleId ?? 1} Lunas · Menunggu Undian
            </div>
          )
        ) : isFormingState ? (
          <div className="w-full py-3 rounded-2xl bg-[#FFC857]/10 border border-[#FFC857]/30 text-[#FFC857] text-xs font-bold text-center flex items-center justify-center gap-2">
            <Icon name="hourglass_empty" className="text-sm" />
            Terdaftar · Menunggu Kuota Terpenuhi
          </div>
        ) : !userProfile ? (
          <button
            onClick={onOpenRegister}
            className="w-full py-3 rounded-2xl bg-[#3E63FF] text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-[0px_0px_20px_rgba(62,99,255,0.4)] hover:bg-[#5B7CFF] active:scale-[0.98]"
          >
            <Icon name="fingerprint" className="text-lg" />
            Daftar untuk Join
          </button>
        ) : (
          <button
            onClick={() =>
              needsApproval ? onApprove(pool.id, pool.contributionAmount) : onJoin(pool.id)
            }
            disabled={isLocked || anyStepPending || isOtherInteracted || !!processingStage}
            className={cn(
              'w-full py-3 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]',
              isLocked || isOtherInteracted
                ? 'bg-white/10 border border-white/10 text-white/40 cursor-not-allowed'
                : (anyStepPending || (isJoiningThis && !!processingStage))
                  ? 'bg-[#3E63FF]/70 text-white cursor-wait'
                  : needsApproval
                    ? 'bg-[#10131A] border border-[#3E63FF] text-[#A9C7FF] hover:bg-[#3E63FF]/15 hover:text-white'
                    : 'bg-[#3E63FF] text-white hover:bg-[#5B7CFF] shadow-[0px_0px_20px_rgba(62,99,255,0.4)]'
            )}
          >
            {isLocked ? (
              <span className="flex items-center gap-1.5 text-xs">
                <Icon name="lock" className="text-sm" />
                {lockReason}
              </span>
            ) : isJoiningThis && processingStage ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                {processingLabel || 'Memproses…'}
              </>
            ) : isApprovePending ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                Menyetujui Token MC…
              </>
            ) : isJoiningThis || isJoinPending ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                Mengonfirmasi Bergabung…
              </>
            ) : needsApproval ? (
              <>
                <Icon name="shield_lock" className="text-lg" />
                Approve MC Token
              </>
            ) : (
              <>
                <Icon name="login" className="text-lg" />
                Join Pool
              </>
            )}
          </button>
        )}

        {/* Link Detail Pool */}
        <div className="text-center pt-1">
          <Link
            href={`/pools/${pool.poolIdOnChain}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#A9C7FF] hover:text-white transition-colors"
          >
            Lihat Detail Pool <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </motion.article>
  )
}