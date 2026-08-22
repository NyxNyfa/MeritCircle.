'use client'

import { useAccount, useConnect } from 'wagmi'
import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '../components/Icon'

function Skeleton({ className }: { className: string }) {
  return <div className={`mc-skeleton ${className}`} />
}

export default function Landing() {
  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const router = useRouter()

  // Hydration guard: false saat SSR, true setelah mount di client (tanpa effect)
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  // Wallet sudah terhubung → langsung ke dashboard
  useEffect(() => {
    if (isMounted && isConnected) router.replace('/dashboard')
  }, [isMounted, isConnected, router])

  const connectWallet = () => {
    if (connectors[0]) connect({ connector: connectors[0] })
  }

  if (!isMounted) {
    return (
      <div className="flex min-h-screen bg-[#10131A] text-[#E2E2E9] font-sans selection:bg-[#3E63FF]/30">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(106.83%_148.48%_at_10%_20%,_rgba(62,99,255,0.15)_0%,_rgba(62,99,255,0)_50%)]" />
        <main className="w-full min-h-screen flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-5 pointer-events-none" />
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest border border-primary/40 flex items-center justify-center shadow-[0_0_25px_rgba(62,99,255,0.3)]">
              <Icon name="token" className="text-2xl text-primary" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#10131A] text-[#E2E2E9] font-sans selection:bg-[#3E63FF]/30">
      {/* Global radial background glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(106.83%_148.48%_at_10%_20%,_rgba(62,99,255,0.15)_0%,_rgba(62,99,255,0)_50%)]" />

      <main className="w-full relative overflow-x-hidden">
        {/* Top Navigation */}
        <header className="bg-surface/80 backdrop-blur-xl dark:bg-surface/80 sticky top-0 z-50 border-b border-outline-variant/10 shadow-sm flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-4">
            <Icon name="hexagon" fill className="text-primary text-2xl" />
            <span className="font-display-lg-mobile text-display-lg-mobile text-primary tracking-tighter">
              Merit Circle
            </span>
          </div>
          <nav className="hidden md:flex gap-8 font-body-md text-body-md">
            {['Product', 'Agents', 'Solutions', 'Resources', 'Pricing'].map((item) => (
              <a
                key={item}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-on-surface-variant hover:text-on-surface hover:opacity-80 transition-all duration-300"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-on-surface-variant hover:text-on-surface font-body-md hidden md:block"
            >
              Login
            </a>
            <button
              onClick={connectWallet}
              className="bg-primary text-on-primary rounded-full px-6 py-2 font-body-md font-semibold hover:opacity-80 transition-all duration-300 scale-95 active:scale-90 shadow-[0px_0px_15px_rgba(62,99,255,0.4)]"
            >
              Connect Wallet
            </button>
          </div>
        </header>

        {/* Hero — aligned kiri penuh: mx-auto max-w-7xl px-6 + items-start */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:py-24 flex flex-col lg:flex-row lg:items-start items-center gap-12 lg:gap-16 min-h-[calc(100vh-80px)]">
          {/* Left Column — konten menempel ke kiri container */}
          <div className="flex-1 space-y-8 z-20 lg:pt-4 max-w-2xl">
            <h1 className="font-display-lg text-display-lg md:text-display-lg-mobile text-on-surface">
              Trustless Web3 <br />
              Savings Protocol
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Automate contributions, manage global yields, and grow your portfolio faster in one unified
              decentralized dashboard.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={connectWallet}
                className="bg-[#3E63FF] text-white rounded-full px-8 py-4 font-body-lg flex items-center gap-2 transition-all duration-300 relative group overflow-hidden shadow-[0px_0px_15px_rgba(62,99,255,0.4)] hover:bg-[#5B7CFF] hover:shadow-[0px_0px_25px_rgba(62,99,255,0.6)]"
              >
                <span className="relative z-10 font-semibold">Explore Platform</span>
                <div className="absolute top-1 left-2 w-1 h-1 bg-white/50 rounded-full" />
                <div className="absolute bottom-1 right-2 w-1 h-1 bg-white/50 rounded-full" />
              </button>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-on-surface-variant hover:text-on-surface px-6 py-4 font-body-lg transition-colors duration-300"
              >
                Learn more
              </a>
            </div>
            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-8 pt-8 mt-8">
              <div className="space-y-2">
                <div className="w-12 h-12 glass-panel rounded-lg flex items-center justify-center text-primary mb-4 border border-outline-variant/30">
                  <Icon name="dashboard_customize" className="text-2xl" />
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Centralized workspace</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Track all of your assets, yields, and protocols from one view.
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 glass-panel rounded-lg flex items-center justify-center text-secondary mb-4 border border-outline-variant/30">
                  <Icon name="event_available" className="text-2xl" />
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Automated strategies</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Use pre-configured smart contracts to optimize your returns automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Visuals — tanpa offset negatif yang mendorong layout */}
          <div className="flex-1 relative w-full h-[560px] lg:max-w-[50%] flex items-center justify-center z-10">
            {/* Status widget */}
            <div className="absolute top-[15%] left-0 glass-panel glass-panel-hover rounded-xl p-4 flex items-center gap-6 shadow-2xl cursor-pointer border border-outline-variant/40">
              <div>
                <p className="font-mono-label text-mono-label text-on-surface-variant uppercase">Last action</p>
                <p className="font-body-md text-on-surface flex items-center gap-2 mt-1">
                  <span className="w-1 h-4 bg-secondary-container rounded-full block" />
                  2 days ago
                </p>
              </div>
              <div className="w-px h-10 bg-outline-variant/30" />
              <div>
                <p className="font-mono-label text-mono-label text-on-surface-variant uppercase">Next action</p>
                <p className="font-body-md text-on-surface flex items-center gap-2 mt-1">
                  <span className="w-1 h-4 bg-primary-container rounded-full block" />
                  due in 3 days
                </p>
              </div>
            </div>

            {/* Yield notice widget */}
            <div className="absolute bottom-[10%] left-[8%] glass-panel glass-panel-hover rounded-xl p-5 w-80 shadow-2xl border border-outline-variant/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon name="hexagon" fill className="text-primary text-sm" />
                  <div>
                    <p className="font-body-md text-on-surface font-semibold text-sm">Merit Protocol</p>
                    <p className="font-mono-label text-mono-label text-on-surface-variant text-[10px]">Yield Notice</p>
                  </div>
                </div>
                <span className="font-price-display text-price-display text-secondary-container text-sm">
                  $12,442.00
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm line-clamp-3 mb-4">
                Hi User,
                <br />
                Your recent liquidity provision in the ETH/USDC pool has accrued significant yield. It appears
                that your rewards are ready to be claimed.
              </p>
              <div className="flex items-center justify-between">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="font-body-md text-on-surface text-sm hover:text-primary transition-colors"
                >
                  Show more
                </a>
                <button className="bg-primary text-on-primary rounded-md px-4 py-1.5 font-body-md text-sm font-medium hover:bg-primary-fixed transition-colors shadow-[0px_0px_15px_rgba(62,99,255,0.4)]">
                  Claim Now
                </button>
              </div>
            </div>

            {/* Deposit widget — right-0, bukan -right-[5%] */}
            <div className="absolute top-[50%] right-0 glass-panel glass-panel-hover rounded-xl p-5 w-48 shadow-2xl border border-outline-variant/40 text-center">
              <div className="w-12 h-12 mx-auto bg-surface-container rounded-full border border-outline-variant/30 flex items-center justify-center mb-3">
                <Icon name="payments" className="text-2xl text-secondary-container" />
              </div>
              <h4 className="font-body-md text-on-surface font-medium mb-1">Deposit</h4>
              <p className="font-mono-label text-mono-label text-on-surface-variant text-[10px] leading-tight">
                Add funds to start earning immediately
              </p>
              <div className="absolute top-2 left-2 w-1 h-1 bg-on-surface-variant/50 rounded-full" />
              <div className="absolute top-2 right-2 w-1 h-1 bg-on-surface-variant/50 rounded-full" />
              <div className="absolute bottom-2 left-2 w-1 h-1 bg-on-surface-variant/50 rounded-full" />
              <div className="absolute bottom-2 right-2 w-1 h-1 bg-on-surface-variant/50 rounded-full" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}