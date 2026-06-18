import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { AttendanceClient } from './AttendanceClient'
import type { AttendanceMember } from './AttendanceClient'
import type { Activity, AttendanceRecord } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AttendanceDetailPage({
  params,
}: {
  params: Promise<{ activityId: string }>
}) {
  noStore()
  const { activityId } = await params
  const supabase = await createClient()

  // ── 取得活動 ──
  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single()

  if (!activity) notFound()
  if (activity.status === 'cancelled') redirect('/attendance')

  // ── 取得此活動的報名名單（正取 + 遞補 + 候補），以報名名單為出席基準 ──
  const { data: registrations } = await supabase
    .from('registrations')
    .select('member_id, status, waitlist_position, registered_at')
    .eq('activity_id', activityId)
    .in('status', ['confirmed', 'promoted', 'waitlist'])
    .order('registered_at', { ascending: true })

  // 若無報名名單，提早返回空頁面
  const regList = registrations ?? []

  // ── 依報名名單取成員資料（不限 status，包含已停用會員）──
  const memberIds = [...new Set(regList.map(r => r.member_id))]

  type MemberRow = { id: string; name: string; display_name: string | null; gender: string }
  let memberMap: Record<string, MemberRow> = {}

  if (memberIds.length > 0) {
    const { data: memberRows } = await supabase
      .from('members')
      .select('id, name, display_name, gender')
      .in('id', memberIds)
      .in('status', ['active', 'pending'])   // 停用帳號不顯示
    memberRows?.forEach(m => { memberMap[m.id] = m })
  }

  // ── 報名資訊 map ──
  const regMap: Record<string, { status: string; waitlistPosition: number | null }> = {}
  regList.forEach(r => {
    regMap[r.member_id] = { status: r.status, waitlistPosition: r.waitlist_position }
  })

  // ── 取得此活動現有的出席紀錄 ──
  const { data: attRecords } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('activity_id', activityId)

  const attMap: Record<string, AttendanceRecord> = {}
  attRecords?.forEach(ar => { attMap[ar.member_id] = ar as AttendanceRecord })

  // ── 取得本季（此活動之外）的最高 season_sequence（用於顯示打卡前牌位）──
  const { data: seasonSeqs } = await supabase
    .from('attendance_records')
    .select('member_id, season_sequence')
    .eq('season_id', activity.season_id)
    .eq('checked_in', true)
    .neq('activity_id', activityId)

  const priorSeqMap: Record<string, number> = {}
  seasonSeqs?.forEach(r => {
    const cur = priorSeqMap[r.member_id] ?? 0
    if ((r.season_sequence ?? 0) > cur) {
      priorSeqMap[r.member_id] = r.season_sequence ?? 0
    }
  })

  // ── 取得欠款資料 ──
  const { data: debts } = memberIds.length > 0
    ? await supabase
        .from('member_debt_summary')
        .select('member_id, total_owed')
        .in('member_id', memberIds)
    : { data: [] }

  const debtMap: Record<string, number> = {}
  debts?.forEach(d => { debtMap[d.member_id] = d.total_owed ?? 0 })

  // ── 組合 AttendanceMember 列表 ──
  const members: AttendanceMember[] = memberIds
    .map(memberId => {
      const mem = memberMap[memberId]
      if (!mem) return null

      const ar = attMap[memberId] ?? null
      const reg = regMap[memberId]

      // 欠款扣掉今日活動部分（避免重複計算）
      const rawDebt = debtMap[memberId] ?? 0
      const todayFee = ar?.fee_amount ?? 0
      const todayIsPending = ar ? ['pending', 'partial'].includes(ar.payment_status) : false
      const priorDebt = Math.max(0, rawDebt - (todayIsPending ? todayFee : 0))

      return {
        memberId,
        name: mem.name,
        displayName: mem.display_name,
        gender: mem.gender as 'male' | 'female',
        role: mem.role,
        debtAmount: priorDebt,
        attendanceRecord: ar,
        registrationStatus: reg?.status ?? null,
        waitlistPosition: reg?.waitlistPosition ?? null,
        priorSeasonSequence: priorSeqMap[memberId] ?? null,
      } satisfies AttendanceMember
    })
    .filter((m): m is AttendanceMember => m !== null)

  // ── 排序：已到場 → 正取/遞補 → 候補（依號碼）──
  members.sort((a, b) => {
    // 1. 已打卡優先
    const aChecked = a.attendanceRecord?.checked_in ? 1 : 0
    const bChecked = b.attendanceRecord?.checked_in ? 1 : 0
    if (aChecked !== bChecked) return bChecked - aChecked

    // 2. 正取/遞補 > 候補
    const statusScore = (s: string | null | undefined) => {
      if (s === 'confirmed' || s === 'promoted') return 2
      if (s === 'waitlist') return 1
      return 0
    }
    const sa = statusScore(a.registrationStatus)
    const sb = statusScore(b.registrationStatus)
    if (sa !== sb) return sb - sa

    // 3. 候補依排號升冪
    if (sa === 1) {
      return (a.waitlistPosition ?? 99) - (b.waitlistPosition ?? 99)
    }

    return 0
  })

  return (
    <AttendanceClient
      activity={activity as Activity}
      members={members}
    />
  )
}
