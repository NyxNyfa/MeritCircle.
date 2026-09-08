'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, BookOpen, Clock, Copy, Edit3, Home, LogOut, Menu, Users, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  isEmailVerified?: boolean
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
  { href: '/help', label: 'Help Center', icon: BookOpen },
  // Admin sengaja tidak ada di nav — akses manual via URL /admin (guard ADMIN_WALLET)
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
              className="relative w-full px-0 mt-1 mb-6"
            >
              {/* Royal Blue Glow Effect */}
              <div className="pointer-events-none absolute inset-x-2 -bottom-6 top-[60%] rounded-[28px] bg-[#3E63FF]/60 blur-[24px] shadow-[0_40px_80px_-16px_rgba(62,99,255,0.8)] z-0" />
              
              <div className="absolute inset-x-0 -bottom-6 mx-auto w-full z-0">
                <div className="flex items-center justify-center gap-1.5 bg-transparent text-center text-[10px] font-medium text-[#A9C7FF]">
                  <Zap className="h-3 w-3" /> Active in Merit Pool
                </div>
              </div>

              {/* 1:3 Aspect Ratio Card */}
              <Card className="relative z-10 w-full aspect-[3/1] overflow-hidden rounded-[20px] border-0 bg-[radial-gradient(120%_120%_at_30%_10%,#1a1a1a_0%,#0f0f10_60%,#0b0b0c_100%)] text-white shadow-2xl flex flex-col justify-between p-3">
                
                {/* Top: Just the Clock aligned to the right */}
                <div className="flex items-center justify-end text-[10px] text-neutral-300">
                  <div className="flex items-center gap-1 opacity-80 shrink-0">
                    <Clock className="h-3 w-3" />
                    <span className="tabular-nums">{timeText}</span>
                  </div>
                </div>

                {/* Bottom: Avatar, TIER TEXT (Replaces Name), and Compact Buttons */}
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar */}
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-[#3E63FF]/50 bg-[#10131A]">
                      <img
                        src={avatarSrc}
                        alt="avatar"
                        className="object-cover w-full h-full"
                        draggable={false}
                      />
                    </div>
                    
                    {/* Tier Text & Username */}
                    <div className="min-w-0 pr-1 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#3E63FF] animate-pulse shadow-[0_0_8px_#3E63FF] shrink-0" />
                        <h3 className="text-sm font-bold tracking-tight text-[#E2E2E9] whitespace-nowrap">
                          {userTier >= 4 ? `Tier ${userTier} VIP` : `Tier ${userTier}`}
                        </h3>
                      </div>
                      <p className="mt-0.5 text-[10px] text-[#A9C7FF] whitespace-nowrap">
                        {userProfile?.username ? `@${userProfile.username}` : statusText}
                      </p>
                    </div>
                  </div>
                  
                  {/* Button: Edit Profile Only */}
                  <div className="shrink-0 pl-1">
                    <Link href="/profile" title="Edit Profil">
                      <Button className="h-8 w-8 rounded-xl bg-white/10 p-0 text-white hover:bg-[#3E63FF]/30 hover:text-[#5B7CFF] border border-white/10 hover:border-[#3E63FF]/40 transition-all flex items-center justify-center" variant="secondary">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
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