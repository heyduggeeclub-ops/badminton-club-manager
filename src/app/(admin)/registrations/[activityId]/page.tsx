import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RegistrationClient, type RegistrationMember } from './RegistrationClient'
import type { Activity } from '@/types'

interface Props {
  params: Promise<{ activityId: string }>
}

async function getPageData(activityId: string) {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // ── Batch 1：activity、members、registrations、season 全部並行 ──────
  const [
    { data: activity },
    { data: members },
    { data: registrations },
    { data: season },
  ] = await Promise.all([
    supabase
      .from('activities')
      .select('id, season_id, activity_date, start_time, end_time, venue_name, court_count, max_per_court, status, notes, fee_rule_id, created_by, created_at, updated_at')
      .eq('id', activityId)
      .single(),
    supabase
      .from('members')
      .select('id, name, display_name, gender, role')
      .in('status', ['active', 'pending'])
      .order('name'),
    supabase
      .from('registrations')
      .select('member_id, status, waitlist_position, registered_at')
      .eq('activity_id', activityId)
      .in('status', ['confirmed', 'promoted', 'waitlist'])
      .order('registered_at', { ascending: true }),
    supabase
      .from('seasons')
      .select('id')
      .lte('start_date', today)
      .gte('end_date', today)
      .single(),
  ])

  if (!activity) return null

  // 建立 memberId → registration 的對應表
  type RegInfo = { status: string; waitlistPosition: number | null }
  const regMap = new Map<string, RegInfo>()
  registrations?.forEach(r => {
    regMap.set(r.member_id, {
      status: r.status,
      waitlistPosition: r.waitlist_position,
    })
  })

  // ── Batch 2：本季出席紀錄 + 本季系統外已出席次數校正（需要 season.id）──
  let seasonSeqMap: Record<string, number> = {}
  if (season && members && members.length > 0) {
    const [{ data: attRecords }, { data: adjustments }] = await Promise.all([
      supabase
        .from('attendance_records')
        .select('member_id')
        .eq('season_id', season.id)
        .eq('checked_in', true)
        .in('member_id', members.map(m => m.id)),
      supabase
        .from('member_season_adjustments')
        .select('member_id, prior_attendance_count')
        .eq('season_id', season.id)
        .in('member_id', members.map(m => m.id)),
    ])
    attRecords?.forEach(r => {
      seasonSeqMap[r.member_id] = (seasonSeqMap[r.member_id] ?? 0) + 1
    })
    // 併入「本季系統外已出席次數」校正，讓報名頁的牌位預覽跟實際打卡收費一致
    adjustments?.forEach(adj => {
      seasonSeqMap[adj.member_id] = (seasonSeqMap[adj.member_id] ?? 0) + adj.prior_attendance_count
    })
  }

  const registrationMembers: RegistrationMember[] = (members ?? []).map(m => {
    const reg = regMap.get(m.id) ?? null
    return {
      memberId: m.id,
      name: m.name,
      displayName: m.display_name,
      gender: m.gender as 'male' | 'female',
      role: m.role,
      registrationStatus: reg ? (reg.status as any) : null,
      waitlistPosition: reg?.waitlistPosition ?? null,
      seasonSequence: seasonSeqMap[m.id] ?? null,
    }
  })

  // 排序：正取 → 候補（依號碼）→ 未報名
  registrationMembers.sort((a, b) => {
    const order = (s: string | null) => {
      if (s === 'confirmed' || s === 'promoted') return 0
      if (s === 'waitlist') return 1
      return 2
    }
    const oa = order(a.registrationStatus)
    const ob = order(b.registrationStatus)
    if (oa !== ob) return oa - ob
    // 候補內按號碼排
    if (oa === 1) return (a.waitlistPosition ?? 99) - (b.waitlistPosition ?? 99)
    return 0
  })

  const maxCapacity = activity.court_count * activity.max_per_court

  return {
    activity: { ...activity, maxCapacity } as Activity & { maxCapacity: number },
    members: registrationMembers,
  }
}

export default async function RegistrationDetailPage({ params }: Props) {
  const { activityId } = await params
  const data = await getPageData(activityId)
  if (!data) notFound()
  return <RegistrationClient activity={data.activity} members={data.members} />
}
