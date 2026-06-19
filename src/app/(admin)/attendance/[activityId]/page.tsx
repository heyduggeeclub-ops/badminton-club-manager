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

  // ── Batch 1：活動 + 報名名單（並行，兩者只需 activityId）────────────
  const [
    { data: activity },
    { data: registrations },
  ] = await Promise.all([
    supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single(),
    supabase
      .from('registrations')
      .select('member_id, status, waitlist_position, registered_at')
      .eq('activity_id', activityId)
      .in('status', ['confirmed', 'promoted', 'waitlist'])
      .order('registered_at', { ascending: true }),
  ])

  if (!activity) notFound()
  if (activity.status === 'cancelled') redirect('/attendance')

  const regList = registrations ?? []
  const memberIds = [...new Set(regList.map(r => r.member_id))]

  // ── 報名資訊 map ──
  const regMap: Record<string, { status: string; waitlistPosition: number | null }> = {}
  regList.forEach(r => {
    regMap[r.member_id] = { status: r.status, waitlistPosition: r.waitlist_position }
  })

  // ── Batch 2：成員資料 + 本季所有出席紀錄（含當場）+ 欠款（並行）────
  // attendance_records 一次查整季，JS 再分割為「本場」vs「過去」，消除重複查詢
  type MemberRow = { id: string; name: string; display_name: string | null; gender: string; role: string }

  const [
    memberRowsResult,
    { data: seasonAttRecords },
    debtResult,
  ] = await Promise.all([
    memberIds.length > 0
      ? supabase
          .from('members')
          .select('id, name, display_name, gender, role')
          .in('id', memberIds)
          .in('status', ['active', 'pending'])
      : Promise.resolve({ data: [] as MemberRow[] }),
    supabase
      .from('attendance_records')
      .select('*')
      .eq('season_id', activity.season_id),
    memberIds.length > 0
      ? supabase
          .from('member_debt_summary')
          .select('member_id, total_owed')
          .in('member_id', memberIds)
      : Promise.resolve({ data: [] as { member_id: string; total_owed: number }[] }),
  ])

  // JS 分割：本場出席紀錄 / 本季其他場次出席紀錄
  const memberMap: Record<string, MemberRow> = {}
  memberRowsResult.data?.forEach((m: MemberRow) => { memberMap[m.id] = m })

  const attMap: Record<string, AttendanceRecord> = {}
  const priorSeqMap: Record<string, number> = {}
  seasonAttRecords?.forEach(ar => {
    if (ar.activity_id === activityId) {
      attMap[ar.member_id] = ar as AttendanceRecord
    } else if (ar.checked_in) {
      const cur = priorSeqMap[ar.member_id] ?? 0
      if ((ar.season_sequence ?? 0) > cur) {
        priorSeqMap[ar.member_id] = ar.season_sequence ?? 0
      }
    }
  })

  const debtMap: Record<string, number> = {}
  debtResult.data?.forEach((d: { member_id: string; total_owed: number }) => {
    debtMap[d.member_id] = d.total_owed ?? 0
  })

  // ── 組合 AttendanceMember 列表 ──
  const members: AttendanceMember[] = memberIds.flatMap(memberId => {
    const mem = memberMap[memberId]
    if (!mem) return []

    const ar = attMap[memberId] ?? null
    const reg = regMap[memberId]

    // 欠款扣掉今日活動部分（避免重複計算）
    const rawDebt = debtMap[memberId] ?? 0
    const todayFee = ar?.fee_amount ?? 0
    const todayIsPending = ar ? ['pending', 'partial'].includes(ar.payment_status) : false
    const priorDebt = Math.max(0, rawDebt - (todayIsPending ? todayFee : 0))

    return [{
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
    } satisfies AttendanceMember]
  })

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
