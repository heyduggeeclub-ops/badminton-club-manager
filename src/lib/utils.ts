import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '（未設定日期）'
  return format(parseISO(dateStr), 'yyyy/MM/dd', { locale: zhTW })
}

export function formatDateWithDay(dateStr: string | null | undefined): string {
  if (!dateStr) return '（未設定日期）'
  return format(parseISO(dateStr), 'yyyy/MM/dd (EEE)', { locale: zhTW })
}

export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5) // "HH:MM"
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`
}

/** @deprecated Use DB query (seasons table) instead of this hardcoded function */
export function getCurrentSeason(): { year: number; quarter: number } {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const quarter = Math.ceil(month / 3)
  return { year, quarter }
}

export function getSeasonLabel(year: number, quarter: number): string {
  return `${year} Q${quarter}`
}

export function cn(...classes: (string | undefined |null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ================================================================
// Member Tier - calculated from season attendance count
// ================================================================

export type MemberTier = {
  emoji: string
  label: string
  bgClass: string
  textClass: string
  borderClass: string
}

const GOLD_TIER: MemberTier = {
  emoji: String.fromCodePoint(0x1F947), label: '金牌',
  bgClass: 'bg-yellow-50', textClass: 'text-yellow-700', borderClass: 'border-yellow-200',
}

// Calculate member tier from season attendance count (and role).
// 團長/副團長 always show Gold; others: 1→Bronze, 2→Silver, 3+→Gold
export function getMemberTier(
  seasonSequence: number | null | undefined,
  role?: string | null
): MemberTier | null {
  if (role === 'leader' || role === 'vice_leader') return GOLD_TIER
  if (!seasonSequence || seasonSequence < 1) return null
  if (seasonSequence === 1) return {
    emoji: String.fromCodePoint(0x1F949), label: '銅牌',
    bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200',
  }
  if (seasonSequence === 2) return {
    emoji: String.fromCodePoint(0x1F948), label: '銀牌',
    bgClass: 'bg-slate-100', textClass: 'text-slate-600', borderClass: 'border-slate-200',
  }
  return GOLD_TIER
}
