'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── 新增收費規則版本 ──────────────────────────────────────
export async function createFeeRule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const name = formData.get('name') as string
  const effective_from = formData.get('effective_from') as string
  const notes = (formData.get('notes') as string) || null

  if (!name || !effective_from) throw new Error('必填欄位缺失')

  const { data, error } = await supabase
    .from('fee_rules')
    .insert({
      name,
      effective_from,
      is_active: false,
      created_by: member?.id ?? null,
      notes,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? '新增失敗')

  // 預設建立 6 個費率階梯（男女各 3 tier）
  const defaultTiers = [
    { gender: 'male',   attendance_from: 1, attendance_to: 1,    amount: 240 },
    { gender: 'male',   attendance_from: 2, attendance_to: 2,    amount: 230 },
    { gender: 'male',   attendance_from: 3, attendance_to: null, amount: 220 },
    { gender: 'female', attendance_from: 1, attendance_to: 1,    amount: 220 },
    { gender: 'female', attendance_from: 2, attendance_to: 2,    amount: 210 },
    { gender: 'female', attendance_from: 3, attendance_to: null, amount: 200 },
  ]

  await supabase.from('fee_rule_tiers').insert(
    defaultTiers.map(t => ({ ...t, fee_rule_id: data.id }))
  )

  revalidatePath('/fee-rules')
  return data.id
}

// ── 更新規則基本資訊 ────────────────────────────────────────
export async function updateFeeRule(
  id: string,
  fields: { name?: string; effective_from?: string; effective_to?: string | null; is_active?: boolean; notes?: string | null }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('fee_rules')
    .update({ ...fields, updated_at: new Date().toISOString() } as any)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/fee-rules')
  revalidatePath('/activities')
}

// ── 更新單一費率階梯 ────────────────────────────────────────
export async function updateFeeRuleTier(
  tierId: string,
  amount: number
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('fee_rule_tiers')
    .update({ amount })
    .eq('id', tierId)

  if (error) throw new Error(error.message)
  revalidatePath('/fee-rules')
}

// ── 批次更新一整張規則的所有費率 ───────────────────────────
export async function updateFeeRuleTiers(
  ruleId: string,
  tiers: Array<{ id: string; amount: number }>
) {
  const supabase = await createClient()

  for (const tier of tiers) {
    const { error } = await supabase
      .from('fee_rule_tiers')
      .update({ amount: tier.amount })
      .eq('id', tier.id)
      .eq('fee_rule_id', ruleId)

    if (error) throw new Error(error.message)
  }

  // 記錄審計日誌
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (member) {
      await supabase.from('audit_logs').insert({
        actor_id: member.id,
        action: 'update_fee_rule_tiers',
        entity_type: 'fee_rule',
        entity_id: ruleId,
        new_data: { tiers },
      })
    }
  }

  revalidatePath('/fee-rules')
}

// ── 更新團長/副團長固定費用 ─────────────────────────────────
export async function updateFeeRuleRoleFees(
  id: string,
  leaderFee: number | null,
  viceLeaderFee: number | null
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('fee_rules')
    .update({ leader_fee: leaderFee, vice_leader_fee: viceLeaderFee } as any)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/fee-rules')
}

// ── 啟用 / 停用規則 ────────────────────────────────────────
export async function setFeeRuleActive(id: string, isActive: boolean) {
  const supabase = await createClient()

  // 如果啟用，先把其他規則停用（通常同時只有一個 active）
  if (isActive) {
    await supabase.from('fee_rules').update({ is_active: false }).neq('id', id)
  }

  const { error } = await supabase
    .from('fee_rules')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/fee-rules')
}
