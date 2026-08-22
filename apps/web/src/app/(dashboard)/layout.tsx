'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useDisconnect } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/components/Toast'
import Sidebar, { type UserProfile } from '@/components/Sidebar'
import RegistrationModal, { type RegisterValues } from '@/components/RegistrationModal'
import { Icon } from '@/components/Icon'
import { RegisterModalContext } from '@/lib/register-modal'

const truncateAddress = (addr: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '')

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { toast } = useToast()

  const [registerOpen, setRegisterOpen] = useState(false)
  const autoOpenRegisterRef = useRef<string | null>(null)

  // Hydration guard: false saat SSR, true setelah mount di client
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery<UserProfile | null>({
    queryKey: ['userProfile', address],
    queryFn: async () => {
      if (!address) return null
      const res = await fetch(`/api/users/${address}`)
      // 404 = benar-benar belum terdaftar (BUKAN error) → null
      if (res.status === 404) return null
      if (!res.ok) throw new Error('Gagal memuat profil')
      return res.json()
    },
    enabled: !!address,
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Refetch eksplisit setiap address berubah (connect / ganti akun) — kartu langsung muncul tanpa refresh
  useEffect(() => {
    if (address) refetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  // Guard: wallet belum terhubung → kembali ke landing
  useEffect(() => {
    if (isMounted && !isConnected) router.replace('/')
  }, [isMounted, isConnected, router])

  // Auto-buka modal registrasi hanya saat wallet benar-benar BELUM terdaftar
  // (GET 404 → userProfile === null setelah loading selesai).
  // 500/network error TIDAK lagi membuka modal — itu bug yang bikin loop "sudah daftar".
  useEffect(() => {
    if (!isProfileLoading && userProfile === null && address && autoOpenRegisterRef.current !== address) {
      autoOpenRegisterRef.current = address
      queueMicrotask(() => setRegisterOpen(true))
    }
  }, [isProfileLoading, userProfile, address])

  const handleRegister = async (values: RegisterValues) => {
    if (!address) throw new Error('Wallet belum terhubung')
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: address,
        username: values.username,
        email: values.email || null,
        socialMedia: values.socialMedia || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal mendaftar')
    // 200 = akun sudah ada (idempotent), 201 = baru dibuat — keduanya sukses, langsung refetch
    const existed = res.status === 200
    toast('success', existed ? 'Akun sudah terdaftar' : 'Profil reputasi aktif', `Selamat datang, ${data.username}!`)
    await refetchProfile()
    setRegisterOpen(false)
  }

  const userTier = userProfile ? Math.floor(userProfile.meritScore / 20) : 0

  return (
    <div className="flex min-h-screen bg-[#10131A] text-[#E2E2E9] font-sans selection:bg-[#3E63FF]/30">
      {/* Global radial background glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(106.83%_148.48%_at_10%_20%,_rgba(62,99,255,0.15)_0%,_rgba(62,99,255,0)_50%)]" />

      {!isMounted || !isConnected ? (
        <main className="w-full min-h-screen flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-5 pointer-events-none" />
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest border border-primary/40 flex items-center justify-center shadow-[0_0_25px_rgba(62,99,255,0.3)]">
              <Icon name="token" className="text-2xl text-primary" />
            </div>
            <div className="mc-skeleton h-3 w-40" />
          </div>
        </main>
      ) : (
        <RegisterModalContext.Provider value={{ openRegister: () => setRegisterOpen(true) }}>
          {/* Mobile top bar */}
          <div className="md:hidden sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-[#3e63ff]/20 flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <Icon name="token" className="text-primary text-xl" />
              <span className="font-headline-md text-headline-md text-primary tracking-tighter">Merit Circle</span>
            </div>
            <div className="flex items-center gap-2">
              {address && (
                <span className="font-mono-label text-mono-label text-on-surface-variant">
                  {truncateAddress(address)}
                </span>
              )}
              <button
                onClick={() => disconnect()}
                className="p-2 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-error hover:border-error/50 transition-all duration-300"
                aria-label="Log Out"
              >
                <Icon name="logout" className="text-lg" />
              </button>
            </div>
          </div>

          {/* Persistent collapsible sidebar */}
          <Sidebar
            userProfile={userProfile}
            isProfileLoading={isProfileLoading}
            userTier={userTier}
            onDisconnect={() => disconnect()}
            onOpenRegister={() => setRegisterOpen(true)}
          />

          {/* Page content */}
          <main className="flex-1 p-4 md:p-6 relative z-10 overflow-y-auto min-h-screen">
            <div className="flex flex-col gap-6 max-w-[1400px] mx-auto min-h-full">{children}</div>
          </main>

          <RegistrationModal
            open={registerOpen}
            onClose={() => setRegisterOpen(false)}
            onSubmit={handleRegister}
            walletAddress={address ?? ''}
          />
        </RegisterModalContext.Provider>
      )}
    </div>
  )
}
