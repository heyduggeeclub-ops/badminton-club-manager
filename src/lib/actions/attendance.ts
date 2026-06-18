'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { AttendanceRecord } from '@/types'

// ============================================================
// getCurrentMemberId — 取得目前登入者的 member id
// ============================================================
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

// ============================================================
// checkInMember — 打卡到場（建立或更新 attendance_record）
// 回傳最新的 attendance_record
// ============================================================
export async function checkInMember(
  activityId: string,
  memberId: string
): Promise<AttendanceRecord> {
  const supabase = await createClient()
  const checkedInBy = await getCurrentMemberId()

  // 取得活動資料（日期、費率、季度）
  const { data: activity, error: actErr } = await supabase
    .from('activities')
    .select('id, activity_date, fee_rule_id, season_id')
    .eq('id', activityId)
    .single()
  if (actErr || !activity) throw new Error('找不到活動')

  // 取得會員性別與角色
  const { data: member, error: memErr } = await supabase
    .from('members')
    .select('id, gender, role')
    .eq('id', memberId)
    .single()
  if (memErr || !member) throw new Error('找不到會員')

  // 確認是否已有 attendance_record
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id, checked_in')
    .eq('activity_id', activityId)
    .eq('member_id', memberId)
    .single()

  if (existing) {
    // 已有紀錄 → 只更新 checked_in
    await supabase
      .from('attendance_records')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: checkedInBy,
      })
      .eq('id', existing.id)
  } else {
    // 無紀錄 → 計算費率，建立新紀錄
    let feeAmount: number | null = null
    let seasonSequence: number | null = null

    if (activity.fee_rule_id) {
      // 季度出席次序（這次之前的出席次數 + 1）
      const { data: seq } = await supabase.rpc('get_season_sequence', {
        p_member_id: memberId,
        p_season_id: activity.season_id,
        p_activity_date: activity.activity_date,
      })
      seasonSequence = seq ?? 1

      // 依費率規則查詢費用（傳入 role，若有固定費用則優先套用）
      const { data: fee } = await supabase.rpc('get_fee_amount', {
        p_fee_rule_id: activity.fee_rule_id,
        p_gender: member.gender,
        p_season_sequence: seasonSequence,
        p_role: member.role,
      })
      feeAmount = fee ?? null
    }

    await supabase
      .from('attendance_records')
      .insert({
        activity_id: activityId,
        member_id: memberId,
        season_id: activity.season_id,
        fee_rule_id: activity.fee_rule_id,
        checked_in_by: checkedInBy,
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        season_sequence: seasonSequence,
        fee_amount: feeAmount,
        payment_status: 'pending',
        paid_amount: 0,
      })
  }

  // 回傳最新資料（讓 Client 可以更新 fee_amount / season_sequence）
  const { data: ar, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('activity_id', activityId)
    .eq('member_id', memberId)
    .single()

  if (error || !ar) throw new Error('無法讀取打卡紀錄')

  revalidatePath(`/attendance/${activityId}`)
  return ar as AttendanceRecord
}

// ============================================================
// uncheckMember — 取消到場
// ============================================================
export async function uncheckMember(
  activityId: string,
  memberId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('attendance_records')
    .update({
      checked_in: false,
      checked_in_at: null,
    })
    .eq('activity_id', activityId)
    .eq('member_id', memberId)

  if (error) throw error
  revalidatePath(`/attendance/${activityId}`)
}

// ============================================================
// markMemberPaid — 標記單一會員已付款
// ============================================================
export async function markMemberPaid(
  activityId: string,
  memberId: string,
  amount: number,
  method: 'cash' | 'transfer' | 'other' = 'cash'
): Promise<void> {
  const supabase = await createClient()
  const collectedBy = await getCurrentMemberId()

  // 更新 attendance_record
  const { data: ar, error: arErr } = await supabase
    .from('attendance_records')
    .update({
      payment_status: 'paid',
      paid_amount: amount,
    })
    .eq('activity_id', activityId)
    .eq('member_id', memberId)
    .eq('checked_in', true)
    .select('id')
    .single()

  if (arErr || !ar) throw new Error('找不到出席紀錄')

  // 建立收款交易
  const { data: tx, error: txErr } = await supabase
    .from('payment_transactions')
    .insert({
      member_id: memberId,
      activity_id: activityId,
      collected_by: collectedBy,
      amount,
      payment_method: method,
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (txErr || !tx) throw new Error('建立收款紀錄失敗')

  // 建立付款分配
  await supabase
    .from('payment_allocations')
    .insert({
      payment_transaction_id: tx.id,
      attendance_record_id: ar.id,
      amount,
    })

  revalidatePath(`/attendance/${activityId}`)
}

// ============================================================
// markMemberUnpaid — 撤銷單一會員付款（重置為待收）
// ============================================================
export async function markMemberUnpaid(
  activityId: string,
  memberId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('attendance_records')
    .update({
      payment_status: 'pending',
      paid_amount: 0,
    })
    .eq('activity_id', activityId)
    .eq('member_id', memberId)

  if (error) throw error
  revalidatePath(`/attendance/${activityId}`)
}

// ============================================================
// markAllPaid — 一鍵全部標記現金已收
// ============================================================
export async function markAllPaid(activityId: string): Promise<void> {
  const supabase = await createClient()
  const collectedBy = await getCurrentMemberId()

  // 取得所有已到場但未付款的紀錄
  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('id, member_id, fee_amount')
    .eq('activity_id', activityId)
    .eq('checked_in', true)
    .in('payment_status', ['pending', 'partial'])

  if (error) throw error
  if (!records || records.length === 0) return

  // 逐筆處理
  for (const record of records) {
    const amount = record.fee_amount ?? 0
    if (amount <= 0) continue

    await supabase
      .from('attendance_records')
      .update({ payment_status: 'paid', paid_amount: amount })
      .eq('id', record.id)

    const { data: tx } = await supabase
      .from('payment_transactions')
      .insert({
        member_id: record.member_id,
        activity_id: activityId,
        collected_by: collectedBy,
        amount,
        payment_method: 'cash',
        paid_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (tx) {
      await supabase
        .from('payment_allocations')
        .insert({
          payment_transaction_id: tx.id,
          attendance_record_id: record.id,
          amount,
        })
    }
  }

  revalidatePath(`/attendance/${activityId}`)
}

// ============================================================
// recalculateSeasonSequences — 重算指定季度的出席次序與費率
// 用於：活動建立順序與日期順序不一致時的修正
// ============================================================
export async function recalculateSeasonSequences(
  seasonId: string
): Promise<{ updated: number }> {
  const supabase = await createClient()

  // 取得此季度所有活動，依 activity_date 排序
  const { data: activities, error: actErr } = await supabase
    .from('activities')
    .select('id, activity_date')
    .eq('season_id', seasonId)
    .order('activity_date', { ascending: true })

  if (actErr || !activities) throw new Error('查詢活動失敗')

  // 依活動日期順序，逐一重算各會員的 season_sequence
  const memberSeqMap: Record<string, number> = {}
  let updated = 0

  for (const activity of activities) {
    const { data: records } = await supabase
      .from('attendance_records')
      .select('id, member_id, fee_rule_id, season_sequence')
      .eq('activity_id', activity.id)
      .eq('checked_in', true)

    for (const record of records ?? []) {
      const memberId = record.member_id
      memberSeqMap[memberId] = (memberSeqMap[memberId] ?? 0) + 1
      const newSeq = memberSeqMap[memberId]

      if (record.season_sequence === newSeq) continue

      // 重新計算費率（以修正後的次序為基準）
      let newFeeAmount: number | null = null
      if (record.fee_rule_id) {
        const { data: mem } = await supabase
          .from('members')
          .select('gender, role')
          .eq('id', memberId)
          .single()

        if (mem) {
          const { data: fee } = await supabase.rpc('get_fee_amount', {
            p_fee_rule_id: record.fee_rule_id,
            p_gender: mem.gender,
            p_season_sequence: newSeq,
            p_role: mem.role,
          })
          newFeeAmount = fee ?? null
        }
      }

      await supabase
        .from('attendance_records')
        .update({
          season_sequence: newSeq,
          ...(newFeeAmount !== null ? { fee_amount: newFeeAmount } : {}),
        })
        .eq('id', record.id)

      updated++
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/attendance')
  return { updated }
}

// ============================================================
// completeActivity — 結束活動（設定 status = completed）
// ============================================================
export async function completeActivity(activityId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('activities')
    .update({ status: 'completed' })
    .eq('id', activityId)

  if (error) throw error

  revalidatePath(`/attendance/${activityId}`)
  revalidatePath('/activities')
  revalidatePath('/dashboard')

  redirect('/attendance')
}
