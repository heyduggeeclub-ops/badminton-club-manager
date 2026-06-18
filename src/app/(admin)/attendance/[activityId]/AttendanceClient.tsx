'use client'

import { useState, useTransition } from 'react'
import { cn, formatCurrency, formatDate, formatTime, getMemberTier } from '@/lib/utils'
import {
  checkInMember,
  uncheckMember,
  markMemberPaid,
  markMemberUnpaid,
  markAllPaid,
  completeActivity,
} from '@/lib/actions/attendance'
import type { AttendanceRecord, Activity } from '@/types'
import { ChevronLeft, Search, DollarSign, CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type Phase = 'checkin' | 'payment'

// 出席管理用的會員資料結構
export interface AttendanceMember {
  memberId: string
  name: string
  displayName: string | null
  gender: 'male' | 'female'
  role: string
  debtAmount: number              // 今日活動之外的既有欠款
  attendanceRecord: AttendanceRecord | null
  registrationStatus?: string | null  // 'confirmed' | 'promoted' | 'waitlist' | null
  waitlistPosition?: number | null    // 候補排號
  priorSeasonSequence: number | null  // 打卡前的本季序號（用於顯示目前牌位）
}

interface Props {
  activity: Activity
  members: AttendanceMember[]
}

export function AttendanceClient({ activity, members: initialMembers }: Props) {
  const [phase, setPhase] = useState<Phase>('checkin')
  const [members, setMembers] = useState<AttendanceMember[]>(initialMembers)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  // ---- 計算統計 ----
  const checkedIn    = members.filter(m => m.attendanceRecord?.checked_in)
  const notCheckedIn = members.filter(m => !m.attendanceRecord?.checked_in)
  const totalFee     = checkedIn.reduce((s, m) => s + (m.attendanceRecord?.fee_amount ?? 0), 0)
  const paidCount    = checkedIn.filter(m => m.attendanceRecord?.payment_status === 'paid').length
  const paidAmount   = checkedIn.reduce((s, m) => s + (m.attendanceRecord?.paid_amount ?? 0), 0)
  const allPaid      = checkedIn.length > 0 && paidCount === checkedIn.length

  // ---- 搜尋過濾 ----
  const filterMember = (m: AttendanceMember) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      (m.displayName?.toLowerCase().includes(q) ?? false)
    )
  }

  // ---- 打卡切換（樂觀更新） ----
  function toggleCheckin(memberId: string) {
    const original = members.find(m => m.memberId === memberId)
    if (!original) return
    const wasChecked = original.attendanceRecord?.checked_in ?? false

    // 立即更新 UI
    setMembers(prev => prev.map(m => {
      if (m.memberId !== memberId) return m
      const now = new Date().toISOString()
      return {
        ...m,
        attendanceRecord: m.attendanceRecord
          ? { ...m.attendanceRecord, checked_in: !wasChecked, checked_in_at: wasChecked ? null : now }
          : {
              id: `temp-${memberId}`,
              registration_id: null,
              activity_id: activity.id,
              member_id: memberId,
              season_id: activity.season_id,
              fee_rule_id: activity.fee_rule_id,
              checked_in_by: null,
              checked_in: true,
              checked_in_at: now,
              season_sequence: (m.priorSeasonSequence ?? 0) + 1, // 樂觀預估，伺服器確認後覆蓋
              fee_amount: null,    // 待伺服器計算後更新
              payment_status: 'pending',
              paid_amount: 0,
              created_at: now,
              updated_at: now,
            },
      }
    }))

    // 呼叫 Server Action，更新後補充 fee_amount / season_sequence
    startTransition(async () => {
      try {
        if (wasChecked) {
          await uncheckMember(activity.id, memberId)
          // 取消打卡：清除 attendance record 狀態
          setMembers(prev => prev.map(m => {
            if (m.memberId !== memberId) return m
            return {
              ...m,
              attendanceRecord: m.attendanceRecord
                ? { ...m.attendanceRecord, checked_in: false, checked_in_at: null }
                : null,
            }
          }))
        } else {
          // 打卡：伺服器回傳含 fee_amount 的完整 record
          const ar = await checkInMember(activity.id, memberId)
          setMembers(prev => prev.map(m => {
            if (m.memberId !== memberId) return m
            return { ...m, attendanceRecord: ar }
          }))
        }
      } catch {
        // 失敗：還原
        setMembers(prev => prev.map(m => {
          if (m.memberId !== memberId) return m
          return { ...m, attendanceRecord: original.attendanceRecord }
        }))
      }
    })
  }

  // ---- 付款切換（樂觀更新） ----
  function togglePaid(memberId: string) {
    const original = members.find(m => m.memberId === memberId)
    if (!original?.attendanceRecord) return
    const wasPaid = original.attendanceRecord.payment_status === 'paid'
    const feeAmount = original.attendanceRecord.fee_amount ?? 0

    setMembers(prev => prev.map(m => {
      if (m.memberId !== memberId || !m.attendanceRecord) return m
      return {
        ...m,
        attendanceRecord: {
          ...m.attendanceRecord,
          payment_status: wasPaid ? 'pending' : 'paid',
          paid_amount: wasPaid ? 0 : feeAmount,
        },
      }
    }))

    startTransition(async () => {
      try {
        if (wasPaid) {
          await markMemberUnpaid(activity.id, memberId)
        } else {
          await markMemberPaid(activity.id, memberId, feeAmount, 'cash')
        }
      } catch {
        setMembers(prev => prev.map(m => {
          if (m.memberId !== memberId) return m
          return { ...m, attendanceRecord: original.attendanceRecord }
        }))
      }
    })
  }

  // ---- 全部現金已收 ----
  function handleMarkAllPaid() {
    setMembers(prev => prev.map(m => {
      if (!m.attendanceRecord?.checked_in) return m
      if (m.attendanceRecord.payment_status === 'paid') return m
      return {
        ...m,
        attendanceRecord: {
          ...m.attendanceRecord,
          payment_status: 'paid',
          paid_amount: m.attendanceRecord.fee_amount ?? 0,
        },
      }
    }))
    startTransition(() => markAllPaid(activity.id))
  }

  // ================================================================
  // Phase 1: 打卡頁
  // ================================================================
  if (phase === 'checkin') {
    const filteredChecked   = checkedIn.filter(filterMember)
    const filteredUnchecked = notCheckedIn.filter(filterMember)

    return (
      <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100dvh - 56px)' }}>

        {/* ── 標頭 ── */}
        <div className="bg-indigo-600 text-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/attendance" className="text-white/70 hover:text-white p-0.5 -ml-0.5">
              <ChevronLeft size={22} />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-tight truncate">{activity.venue_name}</p>
              <p className="text-indigo-200 text-xs mt-0.5">
                {formatDate(activity.activity_date)} · {formatTime(activity.start_time)}–{formatTime(activity.end_time)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-2xl font-extrabold">{checkedIn.length}</span>
              <span className="text-indigo-300 text-sm">/{members.length}</span>
            </div>
          </div>
          {/* 進度條 */}
          <div className="bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${members.length > 0 ? (checkedIn.length / members.length) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-indigo-200 mt-1">
            <span>已到 {checkedIn.length} 人</span>
            <span>未到 {notCheckedIn.length} 人</span>
          </div>
        </div>

        {/* ── 搜尋 ── */}
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

        {/* ── 名單 ── */}
        <div className="flex-1 overflow-y-auto">
          {/* 已到場 */}
          {filteredChecked.length > 0 && (
            <>
              <div className="sticky top-0 z-10 px-4 py-2 bg-green-50 border-b border-green-100 backdrop-blur-sm">
                <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
                  已到場 {filteredChecked.length} 人
                </span>
              </div>
              {filteredChecked.map(m => (
                <CheckinRow
                  key={m.memberId}
                  member={m}
                  checked
                  onToggle={() => toggleCheckin(m.memberId)}
                />
              ))}
            </>
          )}

          {/* 尚未確認 */}
          {filteredUnchecked.length > 0 && (
            <>
              <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50 border-b border-gray-100 backdrop-blur-sm">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  尚未到場 {filteredUnchecked.length} 人
                </span>
                <span className="ml-2 text-xs text-gray-400 font-normal">點名字打卡</span>
              </div>
              {filteredUnchecked.map(m => (
                <CheckinRow
                  key={m.memberId}
                  member={m}
                  checked={false}
                  onToggle={() => toggleCheckin(m.memberId)}
                />
              ))}
            </>
          )}

          {filteredChecked.length + filteredUnchecked.length === 0 && (
            <div className="p-10 text-center text-gray-400 text-sm">找不到符合的會員</div>
          )}
        </div>

        {/* ── 底部列 ── */}
        <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-4 flex-shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700">已到 {checkedIn.length} 人</span>
            <span className="text-sm font-bold text-indigo-600">應收 {formatCurrency(totalFee)}</span>
          </div>
          <button
            onClick={() => setPhase('payment')}
            disabled={checkedIn.length === 0}
            className={cn(
              'w-full font-bold py-3.5 rounded-2xl text-sm transition-all',
              checkedIn.length > 0
                ? 'bg-green-500 text-white active:bg-green-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            打卡完成，進入收費 →
          </button>
        </div>
      </div>
    )
  }

  // ================================================================
  // Phase 2: 收費頁
  // ================================================================
  const filteredChecked = checkedIn.filter(filterMember)
  const remainingAmount = totalFee - paidAmount

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* ── 標頭 ── */}
      <div className="bg-emerald-600 text-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setPhase('checkin')}
            className="text-white/70 hover:text-white p-0.5 -ml-0.5"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">收費確認</p>
            <p className="text-emerald-200 text-xs mt-0.5">
              {checkedIn.length} 人出席 · 應收 {formatCurrency(totalFee)}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-2xl font-extrabold">{paidCount}</span>
            <span className="text-emerald-300 text-sm">/{checkedIn.length}</span>
          </div>
        </div>
        <div className="bg-white/20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${checkedIn.length > 0 ? (paidCount / checkedIn.length) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-emerald-200 mt-1">
          <span>已收 {paidCount} 人</span>
          <span>待收 {formatCurrency(remainingAmount)}</span>
        </div>
      </div>

      {/* ── 快速操作列 ── */}
      <div className="px-3 py-2 bg-white border-b border-gray-100 flex-shrink-0 flex gap-2">
        <button
          onClick={handleMarkAllPaid}
          disabled={allPaid || isPending || checkedIn.length === 0}
          className={cn(
            'flex-1 font-bold py-2.5 rounded-xl text-sm transition-all',
            !allPaid && checkedIn.length > 0
              ? 'bg-indigo-600 text-white active:bg-indigo-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {allPaid ? '✓ 全部已收' : '全部現金已收'}
        </button>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="search"
            placeholder="搜尋…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-20 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* ── 名單 ── */}
      <div className="flex-1 overflow-y-auto">
        {/* 待收 */}
        {filteredChecked.filter(m => m.attendanceRecord?.payment_status !== 'paid').length > 0 && (
          <>
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                待收款 {filteredChecked.filter(m => m.attendanceRecord?.payment_status !== 'paid').length} 人
              </span>
            </div>
            {filteredChecked
              .filter(m => m.attendanceRecord?.payment_status !== 'paid')
              .map(m => (
                <PaymentRow key={m.memberId} member={m} onToggle={() => togglePaid(m.memberId)} />
              ))}
          </>
        )}

        {/* 已收 */}
        {filteredChecked.filter(m => m.attendanceRecord?.payment_status === 'paid').length > 0 && (
          <>
            <div className="px-4 py-2 bg-green-50 border-b border-green-100">
              <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
                已收款 {filteredChecked.filter(m => m.attendanceRecord?.payment_status === 'paid').length} 人
              </span>
            </div>
            {filteredChecked
              .filter(m => m.attendanceRecord?.payment_status === 'paid')
              .map(m => (
                <PaymentRow key={m.memberId} member={m} onToggle={() => togglePaid(m.memberId)} />
              ))}
          </>
        )}

        {filteredChecked.length === 0 && (
          <div className="p-10 text-center text-gray-400 text-sm">找不到符合的會員</div>
        )}
      </div>

      {/* ── 底部列 ── */}
      <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-4 flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-gray-700">已收 {formatCurrency(paidAmount)}</span>
          {remainingAmount > 0 && (
            <span className="text-sm font-bold text-red-500">待收 {formatCurrency(remainingAmount)}</span>
          )}
          {remainingAmount <= 0 && (
            <span className="text-sm font-bold text-green-600">✓ 全部已收</span>
          )}
        </div>
        <form action={completeActivity.bind(null, activity.id)}>
          <button
            type="submit"
            className="w-full bg-gray-800 text-white font-bold py-3.5 rounded-2xl text-sm active:bg-gray-900 transition-colors"
          >
            結束活動
          </button>
        </form>
      </div>
    </div>
  )
}

// ================================================================
// 打卡 Row 組件
// ================================================================
function CheckinRow({
  member, checked, onToggle,
}: {
  member: AttendanceMember
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 transition-colors text-left',
        checked ? 'bg-green-50 active:bg-green-100' : 'bg-white active:bg-gray-50'
      )}
      onClick={onToggle}
    >
      {/* Avatar */}
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
        member.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
      )}>
        {member.name.slice(-1)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        {/* 名字前顯示牌位 emoji */}
        <p className={cn(
          'font-semibold text-sm leading-tight',
          checked ? 'text-green-800' : 'text-gray-900'
        )}>
          {(() => {
            // 打卡後用當次 season_sequence；打卡前用本季既有 sequence
            const seq = checked
              ? (member.attendanceRecord?.season_sequence ?? null)
              : member.priorSeasonSequence
            const tier = getMemberTier(seq, member.role)
            return tier ? <span className="mr-0.5">{tier.emoji}</span> : null
          })()}
          {member.name}
          {member.displayName && member.displayName !== member.name && (
            <span className="text-xs font-normal text-gray-400 ml-1.5">
              （{member.displayName}）
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 flex items-center flex-wrap gap-x-2">
          <span>{member.gender === 'male' ? '男' : '女'}</span>
          {/* 報名狀態（未到場時顯示） */}
          {!checked && (member.registrationStatus === 'confirmed' || member.registrationStatus === 'promoted') && (
            <span className="text-indigo-500 font-medium">
              {member.registrationStatus === 'promoted' ? '遞補' : '已報名'}
            </span>
          )}
          {!checked && member.registrationStatus === 'waitlist' && (
            <span className="text-amber-500 font-medium">
              候補{member.waitlistPosition != null ? `第 ${member.waitlistPosition} 位` : ''}
            </span>
          )}
          {!checked && !member.registrationStatus && (
            <span className="text-gray-300">未報名</span>
          )}
          {/* 欠款提示 */}
          {member.debtAmount > 0 && (
            <span className="text-red-500 font-semibold">
              <AlertTriangle size={10} className="inline mr-0.5 mb-0.5" />
              欠 {formatCurrency(member.debtAmount)}
            </span>
          )}
          {/* 到場後顯示本季第N次 */}
          {checked && member.attendanceRecord?.season_sequence != null && (
            <span className="text-green-600 font-medium">
              本季第 {member.attendanceRecord.season_sequence} 次
            </span>
          )}
        </p>
      </div>

      {/* Fee + Check icon */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {checked && member.attendanceRecord?.fee_amount != null && (
          <span className="text-xs font-bold text-green-700 tabular-nums">
            {formatCurrency(member.attendanceRecord.fee_amount)}
          </span>
        )}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center transition-all',
          checked
            ? 'bg-green-500 text-white'
            : 'border-2 border-gray-200'
        )}>
          {checked
            ? <CheckCircle2 size={18} className="text-white" />
            : <Circle size={18} className="text-gray-300" />
          }
        </div>
      </div>
    </button>
  )
}

// ================================================================
// 收費 Row 組件
// ================================================================
function PaymentRow({
  member, onToggle,
}: {
  member: AttendanceMember
  onToggle: () => void
}) {
  const isPaid     = member.attendanceRecord?.payment_status === 'paid'
  const feeAmount  = member.attendanceRecord?.fee_amount ?? 0
  const totalDebt  = member.debtAmount + (isPaid ? 0 : feeAmount)

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 transition-colors',
      isPaid ? 'bg-green-50' : 'bg-white'
    )}>
      {/* Avatar */}
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
        member.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
      )}>
        {member.name.slice(-1)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-semibold text-sm leading-tight',
          isPaid ? 'text-green-800' : 'text-gray-900'
        )}>
          {member.name}
        </p>
        {isPaid ? (
          <p className="text-xs text-green-600 font-semibold mt-0.5">
            ✓ 已付 {formatCurrency(feeAmount)}
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-0.5">
            本次 {formatCurrency(feeAmount)}
            {member.debtAmount > 0 && (
              <span className="text-red-500 font-semibold ml-2">
                含欠款共 {formatCurrency(totalDebt)}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Pay toggle button */}
      <button
        onClick={onToggle}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0',
          isPaid
            ? 'bg-green-500 text-white active:bg-green-600'
            : 'border-2 border-gray-200 text-gray-400 active:border-green-400'
        )}
      >
        <DollarSign size={18} />
      </button>
    </div>
  )
}
