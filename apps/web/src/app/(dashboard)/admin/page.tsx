'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'

type Metrics = {
  users: number
  contributions: { paidCount: number; totalPaidMc: number; missedCount: number }
  payouts: { count: number; totalPaidMc: number; totalSurplusMc: number }
  obligations: { active: number; completed: number }
  treasury: { meritPoolContractMc: number; reserveMc: number; treasuryMc: number }
  pools: Array<{ poolIdOnChain: number; status: number; round: number; cycle: number; memberCount: number; collected: number }>
}

type Analytics = {
  acquisition: { walletsConnected: number; emailVerified: number; usernamesCreated: number }
  engagement: {
    poolsViewed: number
    poolJoins: number
    poolCompletions: number
    completionRate: number | null
    auctionBids: number
    auctionParticipants: number
  }
  merit: { averageMerit: number; tierDistribution: Record<string, number>; reputationEvents: number }
  financial: {
    contributionSuccessRate: number | null
    simulatedDefaultRate: number | null
    totalContributedMc: number
    payouts: number
    totalPaidOutMc: number
    totalSurplusMc: number
    avgAuctionDiscount: number | null
    reserveMc: number | null
    treasuryMc: number | null
    reserveUtilization: number | null
  }
}

const STATUS_TEXT = ['OPEN', 'ACTIVE', 'COMPLETED']

export default function AdminPage() {
  const { address } = useAccount()

  const { data, error, isLoading } = useQuery<Metrics>({
    queryKey: ['admin-metrics', address],
    queryFn: async () => {
      const res = await fetch(`/api/admin/metrics?wallet=${address}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      return res.json()
    },
    enabled: !!address,
    refetchInterval: 30_000,
    retry: false,
  })

  const analyticsQ = useQuery<Analytics>({
    queryKey: ['admin-analytics', address],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?wallet=${address}`)
      if (!res.ok) throw new Error('Gagal memuat analytics')
      return res.json()
    },
    enabled: !!address,
    refetchInterval: 60_000,
    retry: false,
  })

  const denied = !!error

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto pb-10">
      <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface tracking-tighter">
        Admin Metrics
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1">
        Metrik protokol (§49/§65) — hanya untuk wallet admin.
      </p>

      {!address && <p className="mt-6 text-sm text-[#C3C6D3]">Hubungkan wallet admin terlebih dahulu.</p>}

      {denied && (
        <div className="mt-6 rounded-2xl border border-[#ff5c5c]/30 bg-[#ff5c5c]/10 px-4 py-3 text-sm text-[#ffb3b3]">
          Akses ditolak — wallet ini bukan ADMIN_WALLET yang terdaftar di server.
        </div>
      )}

      {isLoading && address && <div className="mc-skeleton mt-6 h-40 w-full" />}

      {data && !denied && (
        <div className="mt-6 space-y-4">
          {/* Treasury / exposure */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Saldo MeritPool', value: `${data.treasury.meritPoolContractMc.toLocaleString('id-ID')} MC` },
              { label: 'Protection Reserve', value: `${data.treasury.reserveMc.toLocaleString('id-ID')} MC` },
              { label: 'Treasury', value: `${data.treasury.treasuryMc.toLocaleString('id-ID')} MC` },
              { label: 'Total Surplus', value: `${Math.round(data.payouts.totalSurplusMc).toLocaleString('id-ID')} MC` },
            ].map((s) => (
              <div key={s.label} className="glass-panel rounded-2xl p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">{s.label}</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#E2E2E9]">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Aktivitas */}
          <div className="glass-panel rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              ['Users', data.users],
              ['Iuran dibayar', `${data.contributions.paidCount} (${Math.round(data.contributions.totalPaidMc)} MC)`],
              ['Iuran MISSED', data.contributions.missedCount],
              ['Payout', `${data.payouts.count} (${Math.round(data.payouts.totalPaidMc)} MC)`],
              ['Obligation aktif', data.obligations.active],
              ['Pool tuntas', data.obligations.completed],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="font-mono text-[10px] uppercase text-[#C3C6D3]">{label}</p>
                <p className="font-mono font-bold text-[#E2E2E9] mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Status pool */}
          <div className="glass-panel rounded-2xl p-5 overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-left text-[#C3C6D3] border-b border-white/10">
                  <th className="py-2 pr-4">Pool</th><th className="pr-4">Status</th><th className="pr-4">Round</th><th className="pr-4">Cycle</th><th className="pr-4">Anggota</th><th>Terkumpul</th>
                </tr>
              </thead>
              <tbody>
                {data.pools.map((p) => (
                  <tr key={p.poolIdOnChain} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-[#E2E2E9]">#{p.poolIdOnChain}</td>
                    <td className="pr-4 text-[#5B7CFF]">{STATUS_TEXT[p.status]}</td>
                    <td className="pr-4">{p.round}</td>
                    <td className="pr-4">{p.cycle}</td>
                    <td className="pr-4">{p.memberCount}</td>
                    <td>{p.collected.toLocaleString('id-ID')} MC</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Analytics §65 */}
          {analyticsQ.data && (
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <h2 className="font-mono-label text-mono-label uppercase text-[#5B7CFF]">Analytics KPI (§65)</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  ['Wallets connected', analyticsQ.data.acquisition.walletsConnected],
                  ['Email verified', `${analyticsQ.data.acquisition.emailVerified}/${analyticsQ.data.acquisition.walletsConnected}`],
                  ['Pools viewed', analyticsQ.data.engagement.poolsViewed],
                  ['Pool joins', analyticsQ.data.engagement.poolJoins],
                  ['Completion rate', analyticsQ.data.engagement.completionRate === null ? '—' : `${Math.round(analyticsQ.data.engagement.completionRate * 100)}%`],
                  ['Auction bids', `${analyticsQ.data.engagement.auctionBids} (${analyticsQ.data.engagement.auctionParticipants} user)`],
                  ['Avg merit', Math.round(analyticsQ.data.merit.averageMerit)],
                  ['Reputation events', analyticsQ.data.merit.reputationEvents],
                  ['Contribution success', analyticsQ.data.financial.contributionSuccessRate === null ? '—' : `${Math.round(analyticsQ.data.financial.contributionSuccessRate * 100)}%`],
                  ['Default rate (sim)', analyticsQ.data.financial.simulatedDefaultRate === null ? '—' : `${(analyticsQ.data.financial.simulatedDefaultRate * 100).toFixed(1)}%`],
                  ['Avg diskon auction', analyticsQ.data.financial.avgAuctionDiscount === null ? '—' : `${(analyticsQ.data.financial.avgAuctionDiscount * 100).toFixed(1)}%`],
                  ['Reserve utilization', analyticsQ.data.financial.reserveUtilization === null ? '—' : `${Math.round(analyticsQ.data.financial.reserveUtilization * 100)}%`],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="font-mono text-[10px] uppercase text-[#C3C6D3]">{label}</p>
                    <p className="font-mono font-bold text-[#E2E2E9] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Distribusi tier */}
              <div>
                <p className="font-mono text-[10px] uppercase text-[#C3C6D3] mb-1.5">Distribusi tier</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(analyticsQ.data.merit.tierDistribution)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([tier, count]) => (
                      <span key={tier} className="rounded-full border border-[#3e63ff]/30 bg-[#3E63FF]/10 px-3 py-1 font-mono text-[11px] text-[#A9C7FF]">
                        T{tier}: {count}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
