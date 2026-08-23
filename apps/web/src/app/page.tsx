'use client'

import { useAccount, useConnect } from 'wagmi'
import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '../components/Icon'

function Skeleton({ className }: { className: string }) {
  return <div className={`mc-skeleton ${className}`} />
}

const HOW_IT_WORKS = [
  { icon: 'link', title: 'Connect', desc: 'Hubungkan wallet Anda — tanpa jargon Web3.' },
  { icon: 'military_tech', title: 'Build Merit', desc: 'Mulai dari Merit Score 0 dan buktikan konsistensi.' },
  { icon: 'group_add', title: 'Join a Pool', desc: 'Pilih pool sesuai tier: Basic hingga Prime.' },
  { icon: 'payments', title: 'Contribute', desc: 'Bayar iuran tiap cycle sebelum deadline.' },
  { icon: 'emoji_events', title: 'Receive Payout', desc: 'Merit Queue untuk Tier 0–3, lelang untuk Elite & Prime.' },
  { icon: 'trending_up', title: 'Level Up', desc: 'Selesaikan pool, naikkan merit, buka tier berikutnya.' },
]

const TIERS = [
  { tier: 0, name: 'Basic', score: '0', contribution: '50 MC × 3', members: 3 },
  { tier: 1, name: 'Standard', score: '1–20', contribution: '100 MC × 5', members: 5 },
  { tier: 2, name: 'Growth', score: '21–50', contribution: '200 MC × 5', members: 5 },
  { tier: 3, name: 'Trusted', score: '51–75', contribution: '100 MC × 10', members: 10 },
  { tier: 4, name: 'Elite', score: '76–90', contribution: '100 MC × 5', members: 5, auction: true },
  { tier: 5, name: 'Prime', score: '91–100', contribution: '500 MC × 5', members: 5, auction: true },
]

const TIER_BADGE_STYLES = [
  'from-[#8d8d92] to-[#5a5a60]',
  'from-[#7fb2ff] to-[#3E63FF]',
  'from-[#6ee7b7] to-[#0ea472]',
  'from-[#ffd166] to-[#e0a800]',
  'from-[#a78bfa] to-[#6d3ef0]',
  'from-[#ffb020] to-[#ff7a00]',
]

export default function Landing() {
  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const router = useRouter()

  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

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
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(106.83%_148.48%_at_10%_20%,_rgba(62,99,255,0.15)_0%,_rgba(62,99,255,0)_50%)]" />

      <main className="w-full relative overflow-x-hidden">
        {/* ===== Nav ===== */}
        <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-50 border-b border-outline-variant/10 shadow-sm flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-4">
            <Icon name="hexagon" fill className="text-primary text-2xl" />
            <span className="font-display-lg-mobile text-display-lg-mobile text-primary tracking-tighter">Merit Pool</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 font-mono-label text-mono-label uppercase text-on-surface-variant">
            <a href="#how-it-works" className="hover:text-on-surface transition-colors">How It Works</a>
            <a href="#tiers" className="hover:text-on-surface transition-colors">Tiers</a>
            <a href="#auction" className="hover:text-on-surface transition-colors">Auction</a>
            <Link href="/help" className="hover:text-on-surface transition-colors">Help</Link>
          </nav>
          <button
            onClick={connectWallet}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-[0px_0px_15px_rgba(62,99,255,0.4)] transition-all hover:bg-primary-fixed hover:shadow-[0_0_25px_rgba(62,99,255,0.6)]"
          >
            Connect Wallet
          </button>
        </header>

        {/* ===== Hero ===== */}
        <section className="relative px-6 pt-20 pb-24 max-w-5xl mx-auto text-center">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#3E63FF]/20 rounded-full blur-[140px] pointer-events-none" />
          <p className="relative inline-flex items-center gap-2 rounded-full border border-[#3e63ff]/30 bg-[#10131A]/70 px-4 py-1.5 font-mono-label text-mono-label uppercase text-[#A9C7FF]">
            <span className="w-2 h-2 rounded-full bg-[#56ffa8] animate-pulse" />
            Testnet · Bangun reputasi, bukan spekulasi
          </p>
          <h1 className="relative mt-6 font-headline-lg text-headline-lg md:text-6xl md:leading-[1.05] tracking-tighter">
            Build Merit.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3E63FF] via-[#7C9BFF] to-[#A9C7FF]">
              Unlock Liquidity.
            </span>
          </h1>
          <p className="relative mt-5 max-w-2xl mx-auto font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            Merit Pool mengadaptasi arisan yang Anda kenal menjadi sistem reputasi on-chain:
            konsisten berkontribusi, selesaikan pool, dan buka akses ke pool serta lelang eksklusif
            di tier yang lebih tinggi.
          </p>
          <div className="relative mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={connectWallet}
              className="rounded-full bg-primary px-8 py-4 font-headline-md text-headline-md text-white shadow-[0px_0px_20px_rgba(62,99,255,0.45)] transition-all duration-300 hover:bg-primary-fixed hover:shadow-[0_0_30px_rgba(62,99,255,0.65)]"
            >
              Start Building Merit
            </button>
            <a
              href="#how-it-works"
              className="rounded-full border border-outline-variant/40 px-8 py-4 font-body-md text-body-md text-on-surface-variant transition-colors hover:border-[#3E63FF] hover:text-on-surface"
            >
              Learn How It Works
            </a>
          </div>
        </section>

        {/* ===== How It Works ===== */}
        <section id="how-it-works" className="px-6 py-16 max-w-6xl mx-auto">
          <h2 className="font-headline-md text-headline-md text-2xl md:text-3xl tracking-tight text-center">
            Cara Kerjanya
          </h2>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="glass-panel glass-panel-hover rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3e63ff]/30 bg-[#3E63FF]/10">
                    <Icon name={step.icon} className="text-xl text-[#5B7CFF]" />
                  </span>
                  <span className="font-mono text-xs text-[#3E63FF]">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold text-[#E2E2E9]">{step.title}</h3>
                <p className="mt-1 text-sm text-on-surface-variant leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Tier Ladder ===== */}
        <section id="tiers" className="px-6 py-16 max-w-6xl mx-auto">
          <h2 className="font-headline-md text-2xl md:text-3xl tracking-tight text-center">
            Enam Tier, Satu Tangga Progresi
          </h2>
          <p className="mt-3 text-center text-sm text-on-surface-variant max-w-xl mx-auto">
            Tier menentukan akses. Semakin tinggi merit Anda, semakin besar pool yang bisa dimasuki —
            dan tier tinggi selalu bisa mengakses tier di bawahnya.
          </p>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {TIERS.map((t) => (
              <div key={t.tier} className="glass-panel rounded-2xl p-4 flex flex-col items-center text-center">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${TIER_BADGE_STYLES[t.tier]} text-black font-black`}>
                  T{t.tier}
                </span>
                <h3 className="mt-3 text-sm font-bold text-[#E2E2E9]">{t.name}</h3>
                <p className="font-mono text-[10px] text-[#C3C6D3] mt-1">Merit {t.score}</p>
                <p className="font-mono text-[11px] text-[#5B7CFF] mt-2">{t.contribution}</p>
                {t.auction ? (
                  <span className="mt-2 rounded-full border border-[#ffb020]/40 bg-[#ffb020]/10 px-2 py-0.5 font-mono-label text-[9px] uppercase text-[#ffb020]">
                    Auction
                  </span>
                ) : (
                  <span className="mt-2 rounded-full border border-white/10 px-2 py-0.5 font-mono-label text-[9px] uppercase text-[#C3C6D3]">
                    Merit Queue
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ===== Auction Explainer ===== */}
        <section id="auction" className="px-6 py-16 max-w-4xl mx-auto">
          <div className="glass-panel rounded-3xl p-8 md:p-12 border-[#ffb020]/25">
            <p className="font-mono-label text-mono-label uppercase text-[#ffb020]">Khusus Tier 4–5</p>
            <h2 className="mt-3 font-headline-md text-2xl md:text-3xl tracking-tight">
              Lelang Diskon: Prioritas Likuiditas untuk yang Paling Efisien
            </h2>
            <p className="mt-4 text-sm md:text-base text-on-surface-variant leading-relaxed">
              Di pool Elite dan Prime, anggota bisa mempercepat giliran payout dengan menawarkan
              jumlah yang bersedia diterima. Bid terendah yang valid menang — dengan batas keras
              diskon <b className="text-[#E2E2E9]">15%</b> agar ekonomi pool tetap adil.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Contoh Elite', value: 'Pool 500 MC → bid 450 MC' },
                { label: 'Diskon', value: '50 MC (10%)' },
                { label: 'Surplus dibagi', value: '60% anggota · 25% reserve · 15% treasury' },
              ].map((c) => (
                <div key={c.label} className="rounded-2xl border border-[#ffb020]/20 bg-[#10131A]/60 p-4">
                  <p className="font-mono text-[10px] uppercase text-[#C3C6D3]">{c.label}</p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#E2E2E9]">{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Reputation + Transparency ===== */}
        <section className="px-6 py-16 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel rounded-3xl p-8">
            <Icon name="verified" fill className="text-3xl text-[#56ffa8]" />
            <h2 className="mt-4 font-headline-md text-xl tracking-tight">Reputasi dari Perilaku, Bukan Dompet</h2>
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              Merit Score 0–100 dihitung dari perilaku Anda di aplikasi: ketepatan iuran, penyelesaian
              pool, konsistensi, dan rekam jejak payout. Bukan dari saldo wallet atau usia akun.
            </p>
          </div>
          <div className="glass-panel rounded-3xl p-8">
            <Icon name="visibility" fill className="text-3xl text-[#5B7CFF]" />
            <h2 className="mt-4 font-headline-md text-xl tracking-tight">Transparansi Penuh</h2>
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              Setiap pool menampilkan anggota, posisi cycle, dan pemenang sebelumnya. Kontribusi dan
              payout terekam sebagai transaksi on-chain yang dapat diverifikasi siapa pun.
            </p>
          </div>
        </section>

        {/* ===== CTA Final ===== */}
        <section className="px-6 pb-24 pt-8 text-center">
          <h2 className="font-headline-md text-2xl md:text-3xl tracking-tight">
            Siap membangun merit pertama Anda?
          </h2>
          <button
            onClick={connectWallet}
            className="mt-6 rounded-full bg-primary px-10 py-4 font-headline-md text-headline-md text-white shadow-[0px_0px_20px_rgba(62,99,255,0.45)] transition-all hover:bg-primary-fixed hover:shadow-[0_0_30px_rgba(62,99,255,0.65)]"
          >
            Start Building Merit
          </button>
        </section>

        {/* ===== Footer ===== */}
        <footer className="border-t border-outline-variant/10 px-6 py-8 text-center space-y-2">
          <p className="font-mono-label text-mono-label uppercase text-[#C3C6D3]/60">
            Merit Pool — Build Merit. Unlock Liquidity.
          </p>
          <p className="text-xs text-[#C3C6D3]/50 max-w-2xl mx-auto leading-relaxed">
            Disclaimer testnet: MC pada aplikasi ini adalah working token testnet tanpa nilai
            finansial, bukan token resmi Merit Circle ($MC telah bermigrasi ke $BEAM). Tidak ada
            janji imbal hasil. Mekanisme sedang dalam tahap validasi perilaku dan simulasi ekonomi.
          </p>
          <Link href="/help" className="inline-block text-xs text-[#5B7CFF] hover:underline">
            Pusat Bantuan
          </Link>
        </footer>
      </main>
    </div>
  )
}
