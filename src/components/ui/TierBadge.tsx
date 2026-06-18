import { getMemberTier } from '@/lib/utils'

interface TierBadgeProps {
  seasonSequence: number | null | undefined
  role?: string | null
  /** sm = 小標籤（列表/打卡頁）, md = 中型卡片（詳情頁）*/
  size?: 'sm' | 'md'
}

/**
 * 依出席次數顯示牌位 Badge。團長/副團長固定金牌。
 * 🥇 金牌 / 🥈 銀牌 / 🥉 銅牌 / null（不顯示）
 */
export function TierBadge({ seasonSequence, role, size = 'sm' }: TierBadgeProps) {
  const tier = getMemberTier(seasonSequence, role)
  if (!tier) return null

  if (size === 'md') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl border ${tier.bgClass} ${tier.textClass} ${tier.borderClass}`}>
        <span className="text-lg leading-none">{tier.emoji}</span>
        {tier.label}會員
      </span>
    )
  }

  // size === 'sm'
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full border ${tier.bgClass} ${tier.textClass} ${tier.borderClass}`}>
      {tier.emoji} {tier.label}
    </span>
  )
}

/** 僅顯示 emoji（用於打卡頁名字前） */
export function TierEmoji({ seasonSequence, role }: { seasonSequence: number | null | undefined; role?: string | null }) {
  const tier = getMemberTier(seasonSequence, role)
  if (!tier) return null
  return <span className="mr-0.5 text-base leading-none">{tier.emoji}</span>
}
