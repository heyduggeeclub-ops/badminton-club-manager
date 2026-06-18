'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Registration } from '@/types'

async function getCurrentMemberId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()
  return data?.id ?? null
}

// ── 候補排號 helper ─────────────────────────────────────────
async function nextWaitlistPosition(supabase: any, activityId: string): Promise<number> {
  const { data } = await supabase
    .from('registrations')
    .select('waitlist_position')
    .eq('activity_id', activityId)
    .eq('status', 'waitlist')
    .order('waitlist_position', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.waitlist_position ?? 0) + 1
}

// ── 候補重新排號 helper ─────────────────────────────────────
async function renumberWaitlist(supabase: any, activityId: string): Promise<void> {
  const { data: remaining } = await supabase
    .from('registrations')
    .select('id')
    .eq('activity_id', activityId)
    .eq('status', 'waitlist')
    .order('registered_at', { ascending: true })

  if (!remaining || remaining.length === 0) return

  for (let i = 0; i < remaining.length; i++) {
    await supabase
      .from('registrations')
      .update({ waitlist_position: i + 1 })
      .eq('id', remaining[i].id)
  }
}

// ── 遞補候補 helper ─────────────────────────────────────────
async function promoteFirstWaitlist(supabase: any, activityId: string): Promise<void> {
  const { data: first } = await supabase
    .from('registrations')
    .select('id')
    .eq('activity_id', activityId)
    .eq('status', 'waitlist')
    .order('waitlist_position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!first) return

  await supabase
    .from('registrations')
    .update({
      status: 'promoted',
      waitlist_position: null,
      promoted_at: new Date().toISOString(),
    })
    .eq('id', first.id)

  // 剩餘候補重新排號
  await renumberWaitlist(supabase, activityId)
}

// ============================================================
// addRegistration — 新增報名（自動判斷正取或候補）
// ============================================================
export async function addRegistration(
  activityId: string,
  memberId: string
): Promise<Registration> {
  const supabase = await createClient()
  const registeredBy = await getCurrentMemberId()

  // 取得活動容量
  const { data: activity } = await supabase
    .from('activities')
    .select('court_count, max_per_court')
    .eq('id', activityId)
    .single()

  const maxCapacity = (activity?.court_count ?? 0) * (activity?.max_per_court ?? 0)

  // 目前正取人數（confirmed + promoted）
  const { count: confirmedCount } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('activity_id', activityId)
    .in('status', ['confirmed', 'promoted'])

  const isWaitlist = (confirmedCount ?? 0) >= maxCapacity

  // 計算候補號碼（若需要）
  const waitlistPosition = isWaitlist
    ? await nextWaitlistPosition(supabase, activityId)
    : null

  // 若已有舊記錄（取消過的）→ 更新
  const { data: existing } = await supabase
    .from('registrations')
    .select('id, status')
    .eq('activity_id', activityId)
    .eq('member_id', memberId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('registrations')
      .update({
        status: isWaitlist ? 'waitlist' : 'confirmed',
        waitlist_position: waitlistPosition,
        cancelled_at: null,
        cancelled_reason: null,
        promoted_at: null,
        registered_at: new Date().toISOString(),
        registered_by: registeredBy,
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error || !data) throw new Error('更新報名失敗')
    revalidatePath(`/registrations/${activityId}`)
    revalidatePath('/registrations')
    revalidatePath(`/activities/${activityId}`)
    return data as Registration
  }

  // 全新報名
  const { data, error } = await supabase
    .from('registrations')
    .insert({
      activity_id: activityId,
      member_id: memberId,
      registered_by: registeredBy,
      status: isWaitlist ? 'waitlist' : 'confirmed',
      waitlist_position: waitlistPosition,
      source: 'admin',
      registered_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error || !data) throw new Error('新增報名失敗')
  revalidatePath(`/registrations/${activityId}`)
  revalidatePath('/registrations')
  revalidatePath(`/activities/${activityId}`)
  return data as Registration
}

// ============================================================
// removeRegistration — 取消報名（正取取消自動遞補候補）
// ============================================================
export async function removeRegistration(
  activityId: string,
  memberId: string
): Promise<void> {
  const supabase = await createClient()

  // 找到當前有效報名
  const { data: reg } = await supabase
    .from('registrations')
    .select('id, status, waitlist_position')
    .eq('activity_id', activityId)
    .eq('member_id', memberId)
    .in('status', ['confirmed', 'promoted', 'waitlist'])
    .maybeSingle()

  if (!reg) return

  // 取消此報名
  const { error } = await supabase
    .from('registrations')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: 'admin_removed',
      waitlist_position: null,
    })
    .eq('id', reg.id)

  if (error) throw error

  if (reg.status === 'confirmed' || reg.status === 'promoted') {
    // 正取取消 → 自動遞補第一位候補
    await promoteFirstWaitlist(supabase, activityId)
  } else if (reg.status === 'waitlist') {
    // 候補取消 → 僅重新排號
    await renumberWaitlist(supabase, activityId)
  }

  revalidatePath(`/registrations/${activityId}`)
  revalidatePath('/registrations')
  revalidatePath(`/activities/${activityId}`)
}
