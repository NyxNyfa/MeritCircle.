'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AtSign, Bell, CheckCircle2, Copy, Crown, Edit3, Mail, ShieldCheck, Users } from 'lucide-react'
import { useAccount, useBalance, useReadContract, useSignMessage } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { formatUnits } from 'viem'
import { cn } from '@/lib/utils'
import { MCIRCLE_ABI } from '@/config/contracts'
import { useContractAddresses } from '@/lib/use-contracts'
import { useToast } from '@/components/Toast'
import EditProfileModal, { type EditProfileValues } from '@/components/EditProfileModal'
import type { UserProfile } from '@/components/Sidebar'
import { getSessionAuthHeaders } from '@/lib/wallet-auth-client'
import { calculateTier } from '@/lib/tier'
const AVATAR_URL = 'https://api.dicebear.com/7.x/avataaars/svg?seed=merit'

const reasonOf = (error: unknown) => {
  const e = error as { shortMessage?: string; message?: string }
  return e.shortMessage || e.message || 'Terjadi kesalahan'
}

type HistoryItem = {
  id: string
  type: 'join' | 'win'
  title: string
  pool: string
  amount: string
  amountIn: boolean
  date: string
  settled: boolean
}

type ActivityData = {
  summary: {
    onTimeRate: number | null
    totalContributed: number
    totalReceived: number
    completedPools: number
    activeObligations: number
    missedCycles: number
  }
  contributions: Array<{
    poolIdOnChain: number
    round: number
    cycle: number
    poolName: string
    amount: number
    status: string
    paidAt: string | null
  }>
  payouts: Array<{
    poolIdOnChain: number
    round: number
    cycle: number
    poolName: string
    nominalAmount: number
    payoutAmount: number
    discount: number
    surplus: number
    createdAt: string
  }>
  obligations: Array<{
    poolIdOnChain: number
    round: number
    poolName: string
    status: string
    contributedCycles: number
    missedCycles: number
    totalCycles: number
  }>
}

export default function ProfilePage() {
  const { address } = useAccount()
  const { toast } = useToast()
  const { signMessageAsync } = useSignMessage()
  const { mcToken: MCIRCLE_ADDRESS } = useContractAddresses()
  const [editOpen, setEditOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const {
    data: userProfile,
    refetch: refetchProfile,
  } = useQuery<UserProfile | null>({
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

  const { data: dbPools } = useQuery<Array<{
    id: string
    poolIdOnChain: number
    name: string
    poolSize: number
    contributionAmount: number
    memberCount?: number
  }>>({
    queryKey: ['pools'],
    queryFn: async () => {
      const res = await fetch('/api/pools')
      if (!res.ok) return []
      return res.json()
    },
    refetchOnWindowFocus: false,
  })

  const { data: mcBalanceData, isPending: isMcPending } = useReadContract({
    address: MCIRCLE_ADDRESS,
    abi: MCIRCLE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const mcBalance = mcBalanceData ? formatUnits(mcBalanceData as bigint, 18) : '0'

  const { data: ethBalanceData, isPending: isEthPending } = useBalance({ address })
  const ethBalance = ethBalanceData ? formatUnits(ethBalanceData.value, ethBalanceData.decimals) : '0'

  const userTier = userProfile ? calculateTier(userProfile.meritScore) : 0
  const tierLabel = userTier >= 4 ? `Tier ${userTier} VIP Member` : `Tier ${userTier} Member`
  const displayName = userProfile?.username ?? (address ? `0x${address.slice(2, 5)}…${address.slice(-4)}` : 'Not Connected')
  const avatarSrc = userProfile?.avatarUrl || AVATAR_URL

  const handleCopy = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast('success', 'Alamat wallet disalin')
    } catch {
      toast('error', 'Gagal menyalin alamat')
    }
  }

  // ===== Riwayat aktivitas nyata (kontribusi + payout + obligations) =====
  const activityQuery = useQuery<ActivityData>({
    queryKey: ['activity', address],
    queryFn: async () => {
      if (!address) throw new Error('Wallet belum terhubung')
      const headers = await getSessionAuthHeaders(address, signMessageAsync)
      const res = await fetch('/api/me/activity', { headers })
      if (!res.ok) throw new Error('Gagal memuat riwayat aktivitas')
      return res.json()
    },
    enabled: !!address,
    retry: false,
  })

  // Active Commitment Widget (Lock-in Status) sesuai spesifikasi README §5.D
  const activeObligation = activityQuery.data?.obligations?.find((o) => o.status === 'ACTIVE')
  const joinedPool = dbPools?.find((p) => userProfile?.memberPoolIds?.includes(p.id))

  const lockInInfo = (() => {
    if (activeObligation) {
      return {
        isLocked: true,
        statusType: 'ACTIVE' as const,
        title: 'Status Arisan Aktif (Terkunci)',
        badge: 'ACTIVE LOCK',
        message: `🔒 Anda sedang arisan di ${activeObligation.poolName}. Siklus ${activeObligation.contributedCycles}/${activeObligation.totalCycles}.`,
        detail: 'Dompet Anda terkunci di pool ini hingga seluruh siklus arisan selesai.',
      }
    }
    if (joinedPool) {
      const neededMembers = Math.max(1, joinedPool.poolSize - (joinedPool.memberCount ?? 1))
      return {
        isLocked: true,
        statusType: 'FORMING' as const,
        title: 'Status Pendaftaran (Terkunci)',
        badge: 'FORMING LOCK',
        message: `🔒 Anda terdaftar di ${joinedPool.name}. Menunggu ${neededMembers} anggota lagi. Terkunci hingga arisan selesai.`,
        detail: 'Arisan akan dimulai otomatis begitu kelompok terisi penuh.',
      }
    }
    return {
      isLocked: false,
      statusType: 'UNLOCKED' as const,
      title: 'Status Bebas (Tidak Terkunci)',
      badge: 'UNLOCKED',
      message: '🔓 Anda tidak terikat di pool mana pun. Siap untuk bergabung ke pool baru sesuai Tier Anda.',
      detail: 'Pilih pool yang tersedia di Dashboard untuk mulai berpartisipasi.',
    }
  })()

  const handleEditSubmit = async (values: EditProfileValues) => {
    if (!address) throw new Error('Wallet belum terhubung')
    const headers = await getSessionAuthHeaders(address, signMessageAsync)
    const res = await fetch(`/api/users/${address}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan profil')
    toast('success', 'Profil diperbarui', `@${data.username}`)
    refetchProfile()
  }

  // ===== Email verification =====
  const [emailInput, setEmailInput] = useState('')
  const [sendingVerify, setSendingVerify] = useState(false)
  const [verifyDevLink, setVerifyDevLink] = useState<string | null>(null)

  const handleSendVerification = async () => {
    if (!address || !emailInput.trim()) {
      toast('error', 'Email wajib diisi', 'Masukkan email yang ingin diverifikasi.')
      return
    }
    setSendingVerify(true)
    try {
      const headers = await getSessionAuthHeaders(address, signMessageAsync)
      const res = await fetch('/api/auth/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ email: emailInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim verifikasi')
      setVerifyDevLink(data.devLink ?? null)
      toast(
        'success',
        'Email verifikasi dikirim',
        data.devLink ? 'Mode dev — link tersedia di bawah.' : `Cek inbox ${emailInput.trim()}.`,
      )
      refetchProfile()
    } catch (error) {
      toast('error', 'Verifikasi gagal', reasonOf(error))
    } finally {
      setSendingVerify(false)
    }
  }

  // ===== Notifikasi feed =====
  type NotificationItem = { id: string; type: string; title: string; body: string; read: boolean; createdAt: string }

  const notificationsQuery = useQuery<{ items: NotificationItem[]; unreadCount: number }>({
    queryKey: ['notifications', address],
    queryFn: async () => {
      if (!address) throw new Error('Wallet belum terhubung')
      const headers = await getSessionAuthHeaders(address, signMessageAsync)
      const res = await fetch('/api/me/notifications', { headers })
      if (!res.ok) throw new Error('Gagal memuat notifikasi')
      return res.json()
    },
    enabled: !!address,
    refetchInterval: 30_000,
    retry: false,
  })

  const historyItems: HistoryItem[] = (() => {
    const a = activityQuery.data
    if (!a) return []
    const wins: HistoryItem[] = a.payouts.map((p) => ({
      id: `win-${p.poolIdOnChain}-${p.round}-${p.cycle}`,
      type: 'win',
      title: 'Menang payout',
      pool: `${p.poolName} · Cycle ${p.cycle}`,
      amount: `+${p.payoutAmount.toLocaleString('id-ID')} MC`,
      amountIn: true,
      date: new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      settled: true,
    }))
    const joins: HistoryItem[] = [...a.contributions]
      .reverse()
      .map((c) => ({
        id: `join-${c.poolIdOnChain}-${c.round}-${c.cycle}`,
        type: 'join' as const,
        title:
          c.status === 'MISSED'
            ? 'Iuran terlewat (default)'
            : c.status === 'LATE'
              ? 'Iuran dibayar terlambat'
              : 'Iuran dibayar',
        pool: `${c.poolName} · Cycle ${c.cycle}`,
        amount: c.status === 'MISSED' ? `−${c.amount || 0} MC` : `−${(c.amount || 0).toLocaleString('id-ID')} MC`,
        amountIn: false,
        date: c.paidAt
          ? new Date(c.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'belum dibayar',
        settled: c.status !== 'MISSED',
      }))
    return [...wins, ...joins].sort((x, y) => y.date.localeCompare(x.date))
  })()

  const handleMarkAllRead = async () => {
    if (!address) return
    try {
      const headers = await getSessionAuthHeaders(address, signMessageAsync)
      await fetch('/api/me/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ all: true }),
      })
      notificationsQuery.refetch()
    } catch {
      toast('error', 'Gagal menandai notifikasi')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="w-full max-w-3xl mx-auto pb-10"
    >
      {/* ===== Cover Photo / Banner ===== */}
      <div className="relative h-44 md:h-52 rounded-3xl overflow-hidden border border-[#3e63ff]/20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3E63FF]/70 via-[#16203d] to-[#10131A]" />
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="absolute -top-16 -right-10 w-72 h-72 bg-[#3E63FF]/30 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -left-10 w-80 h-80 bg-[#A9C7FF]/10 rounded-full blur-[120px]" />
        <span className="absolute inset-0 flex items-center justify-center text-4xl md:text-6xl font-black tracking-[0.35em] text-white/[0.06] select-none uppercase">
          Merit Circle
        </span>
        {userProfile && (
          <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-[#3e63ff]/40 bg-[#10131A]/70 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-[#A9C7FF]">
            🏆 {tierLabel}
          </span>
        )}
      </div>

      {/* ===== Profil Info (avatar overlap) ===== */}
      <div className="relative -mt-14 px-4 sm:px-6">
        <div className="relative rounded-3xl border border-[#3e63ff]/20 bg-[#1D2027]/80 backdrop-blur-xl text-[#E2E2E9] shadow-2xl overflow-visible">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none rounded-3xl overflow-hidden" />
          <div className="relative p-6 pt-0 sm:p-8 sm:pt-0">
            {/* Avatar — overlap cover */}
            <div className="relative -mt-12 mb-4 flex items-end justify-between">
              <div className="h-24 w-24 md:h-28 md:w-28 aspect-square rounded-full overflow-hidden shrink-0 ring-4 ring-[#10131A] border-2 border-[#3E63FF]/40 bg-[#10131A] relative z-10">
                <img src={avatarSrc} alt="avatar" className="object-cover w-full h-full" draggable={false} />
              </div>

              {/* Edit Profile — prominent, kanan atas */}
              <button
                onClick={() => setEditOpen(true)}
                className={cn(
                  'flex items-center gap-2 rounded-full bg-[#3E63FF] text-white px-5 py-2.5 text-sm font-semibold shadow-[0px_0px_15px_rgba(62,99,255,0.4)] hover:bg-[#5B7CFF] hover:shadow-[0px_0px_25px_rgba(62,99,255,0.6)] transition-all duration-300',
                  !address && 'opacity-50 pointer-events-none',
                )}
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </button>
            </div>

            {/* Nama + Tier */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#E2E2E9]">@{displayName}</h1>
              <span className="flex items-center gap-1.5 rounded-full border border-[#3e63ff]/30 bg-[#3E63FF]/10 px-2.5 py-1 text-xs font-medium text-[#A9C7FF]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3E63FF] animate-pulse shadow-[0_0_6px_#3E63FF]" />
                {userProfile?.isVerified ? 'Verified VIP' : 'Active Member'}
              </span>
            </div>

            {/* Wallet address — copyable */}
            {address && (
              <button
                onClick={handleCopy}
                className="mt-2 flex items-center gap-2 font-mono text-xs text-[#C3C6D3] hover:text-[#3E63FF] transition-colors select-all"
              >
                {address}
                <Copy className={cn('h-3.5 w-3.5', copied && 'text-[#56ffa8]')} />
              </button>
            )}

            {/* Bio + Twitter */}
            {(userProfile?.bio || userProfile?.twitterHandle) && (
              <div className="mt-4 space-y-1.5">
                {userProfile?.bio && <p className="text-sm leading-relaxed text-[#C3C6D3] max-w-xl">{userProfile.bio}</p>}
                {userProfile?.twitterHandle && (
                  <p className="flex items-center gap-1.5 text-sm text-[#A9C7FF]">
                    <AtSign className="h-3.5 w-3.5" />
                    {userProfile.twitterHandle}
                  </p>
                )}
              </div>
            )}

            {/* Active Commitment Widget (Lock-in Status) — Spesifikasi README §5.D */}
            <div
              className={cn(
                'mt-6 rounded-2xl border p-4 backdrop-blur-md transition-all duration-300',
                lockInInfo.statusType === 'ACTIVE'
                  ? 'border-[#3E63FF]/50 bg-[#3E63FF]/10 shadow-[0_0_20px_rgba(62,99,255,0.15)]'
                  : lockInInfo.statusType === 'FORMING'
                    ? 'border-[#FFC857]/40 bg-[#FFC857]/10 shadow-[0_0_20px_rgba(255,200,87,0.1)]'
                    : 'border-[#56ffa8]/30 bg-[#56ffa8]/5 shadow-[0_0_20px_rgba(86,255,168,0.05)]',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{lockInInfo.isLocked ? '🔒' : '🔓'}</span>
                  <h3 className="font-semibold text-sm text-[#E2E2E9]">
                    Active Commitment (Lock-in Status)
                  </h3>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
                    lockInInfo.statusType === 'ACTIVE'
                      ? 'border border-[#3E63FF]/50 bg-[#3E63FF]/20 text-[#A9C7FF]'
                      : lockInInfo.statusType === 'FORMING'
                        ? 'border border-[#FFC857]/50 bg-[#FFC857]/20 text-[#FFC857]'
                        : 'border border-[#56ffa8]/50 bg-[#56ffa8]/20 text-[#56ffa8]',
                  )}
                >
                  {lockInInfo.badge}
                </span>
              </div>
              <p className="font-medium text-sm text-[#E2E2E9] leading-relaxed">
                {lockInInfo.message}
              </p>
              <p className="text-xs text-[#C3C6D3] mt-1">
                {lockInInfo.detail}
              </p>
            </div>

            {/* Wallet Stats */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#3e63ff]/20 bg-[#10131A]/60 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">MC Balance</p>
                <p className="mt-1.5 font-mono text-xl font-bold text-[#E2E2E9]">
                  {isMcPending ? '…' : `${Number(mcBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                  <span className="ml-1.5 text-xs font-medium text-[#3E63FF]">MC</span>
                </p>
              </div>
              <div className="rounded-2xl border border-[#3e63ff]/20 bg-[#10131A]/60 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">ETH Balance</p>
                <p className="mt-1.5 font-mono text-xl font-bold text-[#E2E2E9]">
                  {isEthPending ? '…' : `${Number(ethBalance).toLocaleString('en-US', { maximumFractionDigits: 4 })}`}
                  <span className="ml-1.5 text-xs font-medium text-[#3E63FF]">ETH</span>
                </p>
              </div>
            </div>

            {/* Ringkasan merit & arisan — data nyata */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'On-Time Rate', value: activityQuery.data ? (activityQuery.data.summary.onTimeRate === null ? '—' : `${activityQuery.data.summary.onTimeRate}%`) : '…', accent: '#56ffa8' },
                { label: 'Total Iuran', value: `${Math.round(activityQuery.data?.summary.totalContributed ?? 0).toLocaleString('id-ID')} MC`, accent: '#3E63FF' },
                { label: 'Total Payout', value: `${Math.round(activityQuery.data?.summary.totalReceived ?? 0).toLocaleString('id-ID')} MC`, accent: '#FFC857' },
                { label: 'Pool Tuntas', value: `${activityQuery.data?.summary.completedPools ?? 0}`, accent: '#A9C7FF' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-[#3e63ff]/15 bg-[#10131A]/50 px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">{s.label}</p>
                  <p className="mt-1 font-mono text-base font-bold" style={{ color: s.accent }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Email Verification & Notifikasi ===== */}
      <div className="mt-8 px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email verification */}
        <div className="rounded-3xl border border-[#3e63ff]/20 bg-[#1D2027]/60 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#E2E2E9]">
              <Mail className="h-4 w-4 text-[#3E63FF]" /> Email
            </h3>
            {userProfile?.isEmailVerified ? (
              <span className="flex items-center gap-1 rounded-full border border-[#56ffa8]/30 bg-[#56ffa8]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#56ffa8]">
                <ShieldCheck className="h-3 w-3" /> Terverifikasi
              </span>
            ) : (
              <span className="rounded-full border border-[#FFC857]/30 bg-[#FFC857]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#FFC857]">
                Belum verifikasi
              </span>
            )}
          </div>

          {userProfile?.email && (
            <p className="mt-2 font-mono text-xs text-[#C3C6D3] truncate">{userProfile.email}</p>
          )}

          {!userProfile?.isEmailVerified && (
            <div className="mt-3 flex gap-2">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={userProfile?.email ?? 'nama@email.com'}
                inputMode="email"
                className="min-w-0 flex-1 rounded-lg border border-outline-variant/40 bg-surface-container/50 px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
              />
              <button
                onClick={handleSendVerification}
                disabled={sendingVerify}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-semibold transition-all',
                  sendingVerify
                    ? 'loading-state cursor-wait bg-[#3E63FF] text-white'
                    : 'bg-[#3E63FF] text-white hover:bg-[#5B7CFF]',
                )}
              >
                Kirim
              </button>
            </div>
          )}
          {verifyDevLink && (
            <a href={verifyDevLink} className="mt-2 block break-all font-mono text-[10px] text-[#5B7CFF] hover:underline">
              [dev] Buka link verifikasi
            </a>
          )}
        </div>

        {/* Notifikasi */}
        <div className="rounded-3xl border border-[#3e63ff]/20 bg-[#1D2027]/60 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#E2E2E9]">
              <Bell className="h-4 w-4 text-[#3E63FF]" /> Notifikasi
              {!!notificationsQuery.data?.unreadCount && (
                <span className="rounded-full bg-[#3E63FF] px-2 py-0.5 text-[10px] font-bold text-white">
                  {notificationsQuery.data.unreadCount}
                </span>
              )}
            </h3>
            {!!notificationsQuery.data?.unreadCount && (
              <button
                onClick={handleMarkAllRead}
                className="font-mono text-[10px] uppercase tracking-wider text-[#A9C7FF] hover:text-[#3E63FF]"
              >
                Tandai dibaca
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {notificationsQuery.isLoading ? (
              <p className="text-xs text-[#C3C6D3]">Memuat…</p>
            ) : (notificationsQuery.data?.items.length ?? 0) === 0 ? (
              <p className="text-xs text-[#C3C6D3]">Belum ada notifikasi.</p>
            ) : (
              notificationsQuery.data!.items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'rounded-xl border px-3 py-2',
                    n.read ? 'border-white/5 bg-transparent opacity-70' : 'border-[#3e63ff]/25 bg-[#10131A]/60',
                  )}
                >
                  <p className="text-xs font-semibold text-[#E2E2E9]">{n.title}</p>
                  <p className="text-[11px] leading-relaxed text-[#C3C6D3] mt-0.5">{n.body}</p>
                  <p className="font-mono text-[9px] text-[#C3C6D3]/50 mt-1">
                    {new Date(n.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===== Arisan History Feed (data nyata dari indexer) ===== */}
      <div className="mt-8 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight text-[#E2E2E9]">Arisan History</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">
            {historyItems.length} events · on-chain
          </span>
        </div>

        <div className="relative rounded-3xl border border-[#3e63ff]/20 bg-[#1D2027]/60 backdrop-blur-xl p-6">
          {/* Timeline line */}
          <div className="absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-[#3E63FF]/60 via-[#3e63ff]/25 to-transparent" />

          {historyItems.length === 0 ? (
            <p className="text-sm text-[#C3C6D3]">
              Belum ada aktivitas. Gabung pool pertama Anda untuk mulai membangun merit.
            </p>
          ) : (
            <div className="space-y-6">
              {historyItems.slice(0, 12).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.06 * i }}
                className="relative flex gap-4"
              >
                {/* Node ikon */}
                <div
                  className={cn(
                    'relative z-10 h-10 w-10 shrink-0 rounded-full border flex items-center justify-center',
                    item.type === 'win'
                      ? 'border-[#FFC857]/40 bg-[#FFC857]/10 text-[#FFC857]'
                      : 'border-[#3e63ff]/40 bg-[#3E63FF]/10 text-[#3E63FF]',
                  )}
                >
                  {item.type === 'win' ? <Crown className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                </div>

                {/* Isi event */}
                <div className="flex-1 min-w-0 rounded-2xl border border-[#3e63ff]/15 bg-[#10131A]/50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#E2E2E9] truncate">{item.title}</p>
                      <p className="font-mono text-[11px] text-[#C3C6D3] mt-0.5">{item.pool}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-mono text-sm font-bold',
                          item.amountIn ? 'text-[#56ffa8]' : 'text-[#C3C6D3]',
                        )}
                      >
                        {item.amount}
                      </span>
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          item.settled
                            ? 'border border-[#56ffa8]/30 bg-[#56ffa8]/10 text-[#56ffa8]'
                            : 'border border-[#3e63ff]/40 bg-[#3E63FF]/10 text-[#A9C7FF]',
                        )}
                      >
                        {item.settled ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Settled
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#3E63FF] animate-pulse" /> Active
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-[#C3C6D3]/60 mt-2">{item.date}</p>
                </div>
              </motion.div>
            ))}
            </div>
          )}
        </div>
      </div>

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={userProfile}
        onSubmit={handleEditSubmit}
      />
    </motion.div>
  )
}