'use client'

import { useState, useTransition } from 'react'
import { cn, formatDate, formatTime, getMemberTier } from '@/lib/utils'
import { addRegistration, removeRegistration } from '@/lib/actions/registrations'
import type { Activity } from '@/types'
import { ChevronLeft, Search, UserPlus, UserMinus, Clock } from 'lucide-react'
import Link from 'next/link'

export interface RegistrationMember {
  memberId: string
  name: string
  displayName: string | null
  gender: 'male' | 'female'
  role: string
  registrationStatus: 'confirmed' | 'promoted' | 'waitlist' | null
  waitlistPosition: number | null
  seasonSequence: number | null
}

interface Props {
  activity: Activity & { maxCapacity: number }
  members: RegistrationMember[]
}

export function RegistrationClient({ activity, members: initialMembers }: Props) {
  const [members, setMembers] = useState<RegistrationMember[]>(initialMembers)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const confirmed  = members.filter(m => m.registrationStatus === 'confirmed' || m.registrationStatus === 'promoted')
  const waitlist   = members.filter(m => m.registrationStatus === 'waitlist').sort((a, b) => (a.waitlistPosition ?? 99) - (b.waitlistPosition ?? 99))
  const unregistered = members.filter(m => m.registrationStatus === null)

  const q = search.trim().toLowerCase()
  const match = (m: RegistrationMember) =>
    !q || m.name.toLowerCase().includes(q) || (m.displayName?.toLowerCase().includes(q) ?? false)

  const isFull = confirmed.length >= activity.maxCapacity
  const remaining = activity.maxCapacity - confirmed.length

  function toggleMember(memberId: string) {
    const member = members.find(m => m.memberId === memberId)
    if (!member) return

    const wasRegistered = member.registrationStatus !== null
    const prevStatus = member.registrationStatus

    // 樂觀更新
    if (wasRegistered) {
      // 取消：移除此人，若為正取且有候補 → 第一位候補升格（僅 UI 樂觀）
      setMembers(prev => {
        const next = prev.map(m => {
          if (m.memberId === memberId) return { ...m, registrationStatus: null, waitlistPosition: null }
          return m
        })
        // 若取消的是正取，把第一位候補升格
        if (prevStatus === 'confirmed' || prevStatus === 'promoted') {
          const firstWL = next.find(m => m.registrationStatus === 'waitlist')
          if (firstWL) {
            return next.map(m => {
              if (m.memberId === firstWL.memberId) return { ...m, registrationStatus: 'promoted' as const, waitlistPosition: null }
              if (m.registrationStatus === 'waitlist' && m.waitlistPosition)
                return { ...m, waitlistPosition: m.waitlistPosition - 1 }
              return m
            })
          }
        }
        return next
      })
    } else {
      // 新增報名：依當前容量判斷是否為候補（樂觀）
      const currentConfirmed = members.filter(m => m.registrationStatus === 'confirmed' || m.registrationStatus === 'promoted').length
      const willBeWaitlist = currentConfirmed >= activity.maxCapacity
      const nextPos = willBeWaitlist
        ? Math.max(0, ...members.filter(m => m.registrationStatus === 'waitlist').map(m => m.waitlistPosition ?? 0)) + 1
        : null

      setMembers(prev => prev.map(m =>
        m.memberId === memberId
          ? { ...m, registrationStatus: willBeWaitlist ? 'waitlist' : 'confirmed', waitlistPosition: nextPos }
          : m
      ))
    }

    startTransition(async () => {
      try {
        if (wasRegistered) {
          await removeRegistration(activity.id, memberId)
        } else {
          await addRegistration(activity.id, memberId)
        }
      } catch {
        // 失敗還原
        setMembers(initialMembers)
      }
    })
  }

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* 標頭 */}
      <div className="bg-indigo-600 text-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/registrations" className="text-white/70 hover:text-white p-0.5 -ml-0.5">
            <ChevronLeft size={22} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight truncate">{activity.venue_name}</p>
            <p className="text-indigo-200 text-xs mt-0.5">
              {formatDate(activity.activity_date)} · {formatTime(activity.start_time)}–{formatTime(activity.end_time)}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-indigo-300 mb-0.5">正取</div>
            <span className={cn('text-2xl font-extrabold', isFull ? 'text-amber-300' : 'text-white')}>
              {confirmed.length}
            </span>
            <span className="text-indigo-300 text-sm">/{activity.maxCapacity}</span>
          </div>
        </div>

        {/* 進度條 */}
        <div className="bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className={cn('h-2 rounded-full transition-all duration-300', isFull ? 'bg-amber-400' : 'bg-white')}
            style={{ width: `${Math.min((confirmed.length / activity.maxCapacity) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-indigo-200 mt-1">
          <span>正取 {confirmed.length} 人</span>
          <span>
            {isFull
              ? <span className="text-amber-300 font-semibold">候補 {waitlist.length} 人</span>
              : `剩 ${remaining} 位`}
          </span>
        </div>
      </div>

      {/* 搜尋框 */}
      <div className="px-3 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="search"
            placeholder="搜尋姓名或暱稱…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* 名單 */}
      <div className="flex-1 overflow-y-auto">

        {/* ── 正取 ── */}
        {confirmed.filter(match).length > 0 && (
          <>
            <SectionHeader
              label={`正取 ${confirmed.filter(match).length} 人`}
              hint="點名字取消報名"
              color="indigo"
            />
            {confirmed.filter(match).map((m, idx) => (
              <MemberRow
                key={m.memberId}
                member={m}
                index={idx + 1}
                variant="confirmed"
                onToggle={() => toggleMember(m.memberId)}
              />
            ))}
          </>
        )}

        {/* ── 候補 ── */}
        {waitlist.filter(match).length > 0 && (
          <>
            <SectionHeader
              label={`候補 ${waitlist.filter(match).length} 人`}
              hint="取消後自動遞補"
              color="amber"
            />
            {waitlist.filter(match).map(m => (
              <MemberRow
                key={m.memberId}
                member={m}
                index={m.waitlistPosition ?? 0}
                variant="waitlist"
                onToggle={() => toggleMember(m.memberId)}
              />
            ))}
          </>
        )}

        {/* ── 未報名 ── */}
        {unregistered.filter(match).length > 0 && (
          <>
            <SectionHeader
              label={`未報名 ${unregistered.filter(match).length} 人`}
              hint={isFull ? '點名字加入候補' : '點名字加入'}
              color="gray"
            />
            {unregistered.filter(match).map(m => (
              <MemberRow
                key={m.memberId}
                member={m}
                index={0}
                variant="unregistered"
                isFull={isFull}
                onToggle={() => toggleMember(m.memberId)}
              />
            ))}
          </>
        )}

        {confirmed.filter(match).length + waitlist.filter(match).length + unregistered.filter(match).length === 0 && (
          <div className="p-10 text-center text-gray-400 text-sm">找不到符合的會員</div>
        )}
      </div>

      {/* 底部統計 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            正取 <span className="font-bold text-gray-900">{confirmed.length}</span>
            {waitlist.length > 0 && (
              <span className="ml-3 text-amber-600">候補 <span className="font-bold">{waitlist.length}</span></span>
            )}
          </span>
          <span className="text-gray-400 text-xs">容量 {activity.maxCapacity} 人</span>
        </div>
      </div>
    </div>
  )
}

// ── Section Header ──────────────────────────────────────────
function SectionHeader({ label, hint, color }: { label: string; hint: string; color: 'indigo' | 'amber' | 'gray' }) {
  const styles = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700 [&_span]:text-indigo-400',
    amber:  'bg-amber-50 border-amber-100 text-amber-700 [&_span]:text-amber-400',
    gray:   'bg-gray-50 border-gray-100 text-gray-500 [&_span]:text-gray-400',
  }
  return (
    <div className={`sticky top-0 z-10 px-4 py-2 border-b backdrop-blur-sm ${styles[color]}`}>
      <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      <span className="ml-2 text-xs font-normal">{hint}</span>
    </div>
  )
}

// ── MemberRow ───────────────────────────────────────────────
function MemberRow({
  member, index, variant, isFull, onToggle,
}: {
  member: RegistrationMember
  index: number
  variant: 'confirmed' | 'waitlist' | 'unregistered'
  isFull?: boolean
  onToggle: () => void
}) {
  const tier = getMemberTier(member.seasonSequence, member.role)

  const rowBg = {
    confirmed:    'bg-indigo-50 active:bg-indigo-100',
    waitlist:     'bg-amber-50 active:bg-amber-100',
    unregistered: 'bg-white active:bg-gray-50',
  }[variant]

  const avatarBg = member.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'

  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 transition-colors text-left ${rowBg}`}
      onClick={onToggle}
    >
      {/* 序號或頭像 */}
      {variant === 'waitlist' ? (
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-sm flex-shrink-0">
          {index}
        </div>
      ) : (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarBg}`}>
          {member.name.slice(-1)}
        </div>
      )}

      {/* 名字 */}
      <div className="flex-1 min-w-0 text-left">
        <p className={cn(
          'font-semibold text-sm leading-tight',
          variant === 'confirmed' ? 'text-indigo-800' :
          variant === 'waitlist'  ? 'text-amber-800' : 'text-gray-900'
        )}>
          {tier && <span className="mr-0.5">{tier.emoji}</span>}
          {member.name}
          {member.displayName && member.displayName !== member.name && (
            <span className="text-xs font-normal text-gray-400 ml-1.5">（{member.displayName}）</span>
          )}
          {member.registrationStatus === 'promoted' && (
            <span className="ml-1.5 text-xs bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">遞補</span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {member.gender === 'male' ? '男' : '女'}
          {tier && <span className="ml-1.5">{tier.label}</span>}
          {variant === 'waitlist' && <span className="ml-1.5 text-amber-500 font-medium">候補第 {index} 位</span>}
        </p>
      </div>

      {/* 操作 icon */}
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
        variant === 'confirmed' ? 'bg-indigo-500 text-white' :
        variant === 'waitlist'  ? 'bg-amber-400 text-white' :
        'border-2 border-gray-200 text-gray-300'
      )}>
        {variant === 'unregistered'
          ? (isFull ? <Clock size={15} /> : <UserPlus size={16} />)
          : <UserMinus size={16} />
        }
      </div>
    </button>
  )
}
