'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, Clock, Copy, Edit3, Home, LogOut, Menu, Users, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useMemo, useState } from 'react'
import { useToast } from './Toast'

export type UserProfile = {
  username: string
  walletAddress: string
  meritScore: number
  tier: number
  isVerified: boolean
  email?: string | null
  socialMedia?: string | null
  avatarUrl?: string | null
  twitterHandle?: string | null
  bio?: string | null
  memberPoolIds?: string[]
}

type SidebarProps = {
  userProfile: UserProfile | null | undefined
  isProfileLoading: boolean
  userTier: number
  onDisconnect: () => void
  onOpenRegister: () => void
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/swap', label: 'Swap Token', icon: ArrowLeftRight },
  { href: '/profile', label: 'Profile & Tier', icon: Users },
]

const AVATAR_URL = 'https://api.dicebear.com/7.x/avataaars/svg?seed=merit'

export default function Sidebar({
  userProfile,
  isProfileLoading,
  userTier,
  onDisconnect,
  onOpenRegister,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const pathname = usePathname()
  const { toast } = useToast()

  const tierLabel = userTier >= 4 ? `Tier ${userTier} VIP Member` : `Tier ${userTier} Member`
  const avatarSrc = userProfile?.avatarUrl || AVATAR_URL
  const statusText = userProfile?.isVerified ? 'Verified VIP' : 'Active Member'

  const timeText = useMemo(() => {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes().toString().padStart(2, '0')
    const hour12 = ((h + 11) % 12) + 1
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${hour12}:${m} ${ampm}`
  }, [])

  const handleCopyAddress = async () => {
    if (!userProfile?.walletAddress) return
    try {
      await navigator.clipboard.writeText(userProfile.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast('success', 'Alamat wallet disalin')
    } catch {
      toast('error', 'Gagal menyalin alamat')
    }
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-[#3e63ff]/20 bg-[#10131A]/80 backdrop-blur-xl transition-all duration-300 z-10 relative shrink-0 sticky top-0 h-screen',
        isOpen ? 'w-64' : 'w-20',
      )}
    >
      {/* Brand / Toggle */}
      <div className="flex h-20 items-center justify-between border-b border-[#3e63ff]/20 px-4 shrink-0">
        {isOpen && <span className="text-xl font-bold text-[#3E63FF] tracking-tight">MeritCircle.</span>}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          variant="ghost"
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className={cn('hover:bg-[#3E63FF]/20 text-[#E2E2E9]', !isOpen && 'mx-auto')}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Elite Profile Card — right below the logo */}
      <div className="relative mt-4 mb-6 px-4 flex justify-center">
        {/* Royal Blue Glow Background Effect */}
        <div className="pointer-events-none absolute inset-0 bg-[#3E63FF]/20 blur-xl rounded-full z-0" />

        {isProfileLoading ? (
          <div className="relative z-10 w-full flex justify-center">
            <div className="mc-skeleton h-10 w-10 rounded-full" />
          </div>
        ) : userProfile ? (
          /* Identity Card — glowing Framer Motion (full saat sidebar terbuka) */
          isOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative w-full h-auto"
            >
              {/* Glow Effect (Royal Blue) */}
              <div className="pointer-events-none absolute inset-x-0 -bottom-6 top-[68%] rounded-[28px] bg-[#3E63FF]/70 blur-[60px] shadow-[0_40px_80px_-16px_rgba(62,99,255,0.8)] z-0" />

              <div className="relative z-10 w-full overflow-visible rounded-[28px] border border-[#3E63FF]/20 bg-[#1D2027]/80 backdrop-blur-xl text-[#E2E2E9] shadow-2xl p-4">
                {/* Status + Waktu */}
                <div className="mb-3 flex items-center justify-between text-xs text-[#C3C6D3]">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full animate-pulse bg-[#3E63FF] shadow-[0_0_8px_#3E63FF]" />
                    <span className="select-none truncate">{statusText}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-80">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{timeText}</span>
                  </div>
                </div>

                {/* Avatar + Nama + Tier */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[#3E63FF]/50 relative bg-[#10131A]">
                    <img
                      src={avatarSrc}
                      alt="avatar"
                      className="object-cover w-full h-full"
                      draggable={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-[#E2E2E9] tracking-tight">
                      @{userProfile.username}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#A9C7FF] truncate">{tierLabel}</p>
                  </div>
                  <div className="h-9 w-9 shrink-0 bg-[#3E63FF]/20 rounded-full flex items-center justify-center border border-[#3E63FF]/50 text-[#A9C7FF]">
                    🏆
                  </div>
                </div>

                {/* Aksi: Edit Profile + Copy Address */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href="/profile">
                    <button className="h-9 w-full justify-start gap-2 rounded-xl bg-white/5 text-[#E2E2E9] hover:bg-[#3E63FF]/20 border border-transparent hover:border-[#3E63FF]/50 transition-all flex items-center px-3 text-xs font-medium">
                      <Edit3 className="h-3.5 w-3.5 shrink-0" /> Edit Profile
                    </button>
                  </Link>
                  <button
                    onClick={handleCopyAddress}
                    className="h-9 w-full justify-start gap-2 rounded-xl bg-white/5 text-[#E2E2E9] hover:bg-[#3E63FF]/20 border border-transparent hover:border-[#3E63FF]/50 transition-all flex items-center px-3 text-xs font-medium"
                  >
                    <Copy className="h-3.5 w-3.5 shrink-0" /> {copied ? 'Copied!' : 'Copy Address'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 bg-transparent py-1 text-center text-[11px] font-medium text-[#A9C7FF]">
                <Zap className="h-3.5 w-3.5" /> Active in Merit Pool
              </div>
            </motion.div>
          ) : (
            /* Collapsed — cukup avatar chip */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative z-10 p-1 flex justify-center"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[#3E63FF]/50 relative bg-[#10131A]">
                <img
                  src={avatarSrc}
                  alt="avatar"
                  className="object-cover w-full h-full"
                  draggable={false}
                />
              </div>
            </motion.div>
          )
        ) : (
          /* Unregistered — Create Identity CTA */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={cn(
              'relative z-10 flex items-center bg-[#1D2027]/80 border border-[#3E63FF]/30 rounded-[24px] backdrop-blur-md shadow-2xl transition-all duration-300',
              isOpen ? 'w-full p-2' : 'p-1 justify-center',
            )}
          >
            <div className="h-10 w-10 shrink-0 rounded-full ring-2 ring-[#3E63FF]/50 bg-[#10131A] flex items-center justify-center">
              <Users className="h-5 w-5 text-[#3E63FF]" />
            </div>
            {isOpen && (
              <div className="mx-3 min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-[#E2E2E9] tracking-tight">Create Identity</h3>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3] mt-0.5">
                  Wallet belum terdaftar
                </p>
                <Button
                  onClick={onOpenRegister}
                  size="sm"
                  className="mt-2 w-full justify-center shadow-[0px_0px_15px_rgba(62,99,255,0.4)]"
                >
                  <Users className="mr-2 h-3.5 w-3.5" />
                  Daftar Sekarang
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-2 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link key={href} href={href} className="block w-full">
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start hover:bg-[#3E63FF]/20 hover:text-[#3E63FF]',
                    isActive && 'bg-[#3E63FF]/10 text-[#3E63FF]',
                    !isOpen && 'justify-center px-0',
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', isOpen && 'mr-3')} />
                  {isOpen && label}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Disconnect */}
      <div className="p-4 border-t border-[#3e63ff]/20 shrink-0">
        <Button
          variant="ghost"
          onClick={onDisconnect}
          className={cn(
            'w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10',
            !isOpen && 'justify-center',
          )}
        >
          <LogOut className={cn('h-5 w-5 shrink-0', isOpen && 'mr-3')} />
          {isOpen && 'Disconnect Wallet'}
        </Button>
      </div>
    </aside>
  )
}