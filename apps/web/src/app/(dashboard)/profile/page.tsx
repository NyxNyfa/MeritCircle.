'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AtSign, CheckCircle2, Copy, Crown, Edit3, Users } from 'lucide-react'
import { useAccount, useBalance, useReadContract, useSignMessage } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { formatUnits } from 'viem'
import { cn } from '@/lib/utils'
import { MCIRCLE_ABI } from '@/config/contracts'
import { useContractAddresses } from '@/lib/use-contracts'
import { useToast } from '@/components/Toast'
import EditProfileModal, { type EditProfileValues } from '@/components/EditProfileModal'
import type { UserProfile } from '@/components/Sidebar'
import { createWalletAuthHeader } from '@/lib/wallet-auth-client'
import { calculateTier } from '@/lib/tier'
const AVATAR_URL = 'https://api.dicebear.com/7.x/avataaars/svg?seed=merit'

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

// Dummy — nanti diganti data riwayat on-chain (The Graph / event logs)
const ARISAN_HISTORY: HistoryItem[] = [
  {
    id: 'h1',
    type: 'win',
    title: 'Menang Premium Pool',
    pool: 'Premium Pool · Cycle 2',
    amount: '+1.000 MC',
    amountIn: true,
    date: '12 Aug 2026',
    settled: true,
  },
  {
    id: 'h2',
    type: 'join',
    title: 'Joined Basic Pool',
    pool: 'Basic Pool · Cycle 3',
    amount: '−50 MC',
    amountIn: false,
    date: '5 Aug 2026',
    settled: false,
  },
  {
    id: 'h3',
    type: 'join',
    title: 'Joined Standard Pool',
    pool: 'Standard Pool · Cycle 1',
    amount: '−100 MC',
    amountIn: false,
    date: '28 Jul 2026',
    settled: true,
  },
  {
    id: 'h4',
    type: 'win',
    title: 'Menang Basic Pool',
    pool: 'Basic Pool · Cycle 2',
    amount: '+150 MC',
    amountIn: true,
    date: '14 Jul 2026',
    settled: true,
  },
  {
    id: 'h5',
    type: 'join',
    title: 'Joined Basic Pool',
    pool: 'Basic Pool · Cycle 2',
    amount: '−50 MC',
    amountIn: false,
    date: '30 Jun 2026',
    settled: true,
  },
]

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
  const joinedCount = ARISAN_HISTORY.filter((h) => h.type === 'join').length
  const wonCount = ARISAN_HISTORY.filter((h) => h.type === 'win').length

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

  const handleEditSubmit = async (values: EditProfileValues) => {
    if (!address) throw new Error('Wallet belum terhubung')
    const authHeader = await createWalletAuthHeader(address, signMessageAsync)
    const res = await fetch(`/api/users/${address}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-mp-auth': authHeader },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan profil')
    toast('success', 'Profil diperbarui', `@{data.username}`)
    refetchProfile()
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
        <div className="relative rounded-3xl border border-[#3e63ff]/20 bg-[#1D2027]/80 backdrop-blur-xl text-[#E2E2E9] shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
          <div className="relative p-6 pt-0 sm:p-8 sm:pt-0">
            {/* Avatar — overlap cover */}
            <div className="relative -mt-12 mb-4 flex items-end justify-between">
              <div className="h-24 w-24 md:h-28 md:w-28 shrink-0 overflow-hidden rounded-full ring-4 ring-[#10131A] border-2 border-[#3E63FF]/40 bg-[#10131A] relative">
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

            {/* Wallet Stats */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Ringkasan arisan */}
            <div className="mt-4 flex items-center gap-6 rounded-2xl border border-[#3e63ff]/15 bg-[#10131A]/40 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-[#C3C6D3]">
                <Users className="h-4 w-4 text-[#3E63FF]" />
                <span>
                  <b className="text-[#E2E2E9]">{joinedCount}</b> pool joined
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#C3C6D3]">
                <Crown className="h-4 w-4 text-[#FFC857]" />
                <span>
                  <b className="text-[#E2E2E9]">{wonCount}</b> pool won
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Arisan History Feed ===== */}
      <div className="mt-8 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight text-[#E2E2E9]">Arisan History</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">
            {ARISAN_HISTORY.length} events · on-chain
          </span>
        </div>

        <div className="relative rounded-3xl border border-[#3e63ff]/20 bg-[#1D2027]/60 backdrop-blur-xl p-6">
          {/* Timeline line */}
          <div className="absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-[#3E63FF]/60 via-[#3e63ff]/25 to-transparent" />

          <div className="space-y-6">
            {ARISAN_HISTORY.map((item, i) => (
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