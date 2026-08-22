'use client'

import { Icon } from './Icon'

// Badge per Tier (1 Tier = 20 Merit Points). Dipakai di Sidebar & Pool Cards.
const TIER_BADGES = [
  {
    icon: 'star',
    fill: true,
    bg: 'linear-gradient(135deg, #555a63, #26292e)',
    glow: 'rgba(160, 141, 132, 0.35)',
    ring: 'rgba(160, 141, 132, 0.45)',
    label: 'Tier 0 · Genesis',
  },
  {
    icon: 'star',
    fill: true,
    bg: 'linear-gradient(135deg, #d98e4a, #7c4a1d)',
    glow: 'rgba(217, 142, 74, 0.4)',
    ring: 'rgba(217, 142, 74, 0.5)',
    label: 'Tier 1 · Bronze',
  },
  {
    icon: 'workspace_premium',
    fill: true,
    bg: 'linear-gradient(135deg, #c7ccd4, #6e7480)',
    glow: 'rgba(86, 120, 255, 0.5)',
    ring: 'rgba(96, 165, 250, 0.6)',
    label: 'Tier 2 · Silver',
  },
  {
    icon: 'workspace_premium',
    fill: true,
    bg: 'linear-gradient(135deg, #ffd98a, #b8860b)',
    glow: 'rgba(255, 200, 87, 0.5)',
    ring: 'rgba(255, 200, 87, 0.6)',
    label: 'Tier 3 · Gold',
  },
  {
    icon: 'military_tech',
    fill: true,
    bg: 'linear-gradient(135deg, #4f83ff, #1e3a8a)',
    glow: 'rgba(79, 131, 255, 0.55)',
    ring: 'rgba(147, 197, 253, 0.6)',
    label: 'Tier 4 · Elite',
  },
  {
    icon: 'auto_awesome',
    fill: true,
    bg: 'linear-gradient(135deg, #ffb020, #e11d48)',
    glow: 'rgba(255, 176, 32, 0.6)',
    ring: 'rgba(255, 214, 130, 0.65)',
    label: 'Tier 5 · VIP',
  },
]

export type TierBadgeSize = 'sm' | 'lg'

export default function TierBadge({ tier, size = 'sm' }: { tier: number; size?: TierBadgeSize }) {
  const badge = TIER_BADGES[Math.min(Math.max(tier, 0), 5)]
  const isLg = size === 'lg'

  return (
    <div
      className={`relative ${isLg ? 'w-24 h-24' : 'w-12 h-12'} rounded-full flex items-center justify-center border-2`}
      style={{
        background: badge.bg,
        borderColor: badge.ring,
        boxShadow: `0 0 ${isLg ? '25px' : '12px'} ${badge.glow}`,
      }}
      title={badge.label}
      aria-label={badge.label}
    >
      <Icon name={badge.icon} fill={badge.fill} className={`text-white ${isLg ? 'text-4xl' : 'text-xl'}`} />
      {isLg && (
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.25),transparent_55%)]" />
      )}
    </div>
  )
}