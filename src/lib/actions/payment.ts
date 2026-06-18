'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
// repayDebt — 補繳指定出席紀錄的欠款
// 用於：會員詳情頁選擇特定筆次補繳
// ============================================================
export async function repayDebt(
  memberId: string,
  attendanceRecordIds: string[],
  method: 'cash' | 'transfer' | 'other' = 'cash'
): Promise<{ amount: number; sessions: number }> {
  const supabase = await createClient()
  const collectedBy = await getCurrentMemberId()

  // 取得這些 attendance_records 的欠款金額
  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('id, fee_amount, paid_amount, payment_status')
    .in('id', attendanceRecordIds)
    .eq('member_id', memberId)
    .in('payment_status', ['pending', 'partial'])
    .eq('checked_in', true)

  if (error) throw new Error('查詢欠款紀錄失敗')
  if (!records || records.length === 0) return { amount: 0, sessions: 0 }

  const totalAmount = records.reduce((sum, r) => {
    const owed = (r.fee_amount ?? 0) - (r.paid_amount ?? 0)
    return sum + Math.max(0, owed)
  }, 0)

  if (totalAmount <= 0) return { amount: 0, sessions: 0 }

  // 建立補繳交易（activity_id = null 表示非當場收費）
  const { data: tx, error: txErr } = await supabase
    .from('payment_transactions')
    .insert({
      member_id: memberId,
      activity_id: null,
      collected_by: collectedBy,
      amount: totalAmount,
      payment_method: method,
      type: 'debt_repayment',
      paid_at: new Date().toISOString(),
      notes: `補繳 ${records.length} 筆欠款`,
    })
    .select('id')
    .single()

  if (txErr || !tx) throw new Error('建立補繳紀錄失敗')

  // 逐筆建立 payment_allocations 並將 attendance_record 標記為已付
  for (const record of records) {
    const owed = Math.max(0, (record.fee_amount ?? 0) - (record.paid_amount ?? 0))
    if (owed <= 0) continue

    await supabase.from('payment_allocations').insert({
      payment_transaction_id: tx.id,
      attendance_record_id: record.id,
      amount: owed,
    })

    await supabase
      .from('attendance_records')
      .update({
        payment_status: 'paid',
        paid_amount: record.fee_amount ?? 0,
      })
      .eq('id', record.id)
  }

  revalidatePath('/dashboard')
  revalidatePath('/members')
  return { amount: totalAmount, sessions: records.length }
}

// ============================================================
// repayAllDebts — 一鍵結清該會員所有欠款
// 用於：Dashboard 欠款警示快速補繳
// ============================================================
export async function repayAllDebts(
  memberId: string,
  method: 'cash' | 'transfer' | 'other' = 'cash'
): Promise<void> {
  const supabase = await createClient()

  // 取得該會員所有欠款紀錄
  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('member_id', memberId)
    .in('payment_status', ['pending', 'partial'])
    .eq('checked_in', true)

  if (error) throw error
  if (!records || records.length === 0) return

  const ids = records.map(r => r.id)
  await repayDebt(memberId, ids, method)
}
