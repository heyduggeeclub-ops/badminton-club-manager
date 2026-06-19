'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { CreateActivityInput, ActivityStatus } from '@/types'

export async function createActivity(input: CreateActivityInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // venue_cost 不是 activities 表欄位，先分離出來
  const { venue_cost, ...activityInput } = input

  const { data, error } = await supabase
    .from('activities')
    .insert({
      ...activityInput,
      created_by: member?.id ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    actor_id: member?.id,
    action: 'create_activity',
    entity_type: 'activity',
    entity_id: data.id,
    new_data: activityInput,
  })

  // 自動建立場地費用支出記錄
  if ((venue_cost ?? 0) > 0) {
    await supabase.from('expenses').insert({
      activity_id: data.id,
      season_id: activityInput.season_id,
      recorded_by: member?.id ?? null,
      category: 'venue_rental',
      amount: venue_cost,
      description: `場地費用 - ${activityInput.venue_name}`,
      expense_date: activityInput.activity_date,
    })
    revalidatePath('/finance')
  }

  revalidatePath('/activities')
  redirect('/activities/' + data.id)
}

export async function updateActivity(id: string, input: Partial<CreateActivityInput>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { data: oldActivity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single()

  // venue_cost 不是 activities 表欄位，先分離出來
  const { venue_cost, ...activityInput } = input

  const { error } = await supabase
    .from('activities')
    .update(activityInput)
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    actor_id: member?.id,
    action: 'update_activity',
    entity_type: 'activity',
    entity_id: id,
    old_data: oldActivity,
    new_data: activityInput,
  })

  // 同步場地費用支出（僅在 venue_cost 有傳入時才處理）
  if (venue_cost !== undefined) {
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id')
      .eq('activity_id', id)
      .eq('category', 'venue_rental')
      .maybeSingle()

    if ((venue_cost ?? 0) > 0) {
      const expenseData = {
        amount: venue_cost,
        description: `場地費用 - ${activityInput.venue_name ?? oldActivity?.venue_name ?? ''}`,
        expense_date: activityInput.activity_date ?? oldActivity?.activity_date,
      }
      if (existingExpense) {
        await supabase.from('expenses').update(expenseData).eq('id', existingExpense.id)
      } else {
        await supabase.from('expenses').insert({
          ...expenseData,
          activity_id: id,
          season_id: activityInput.season_id ?? oldActivity?.season_id,
          recorded_by: member?.id ?? null,
          category: 'venue_rental',
        })
      }
    } else if (existingExpense) {
      // venue_cost 改為 0 → 刪除原有場地費用記錄
      await supabase.from('expenses').delete().eq('id', existingExpense.id)
    }
    revalidatePath('/finance')
  }

  revalidatePath('/activities')
  revalidatePath('/activities/' + id)
}

export async function updateActivityStatus(id: string, status: ActivityStatus) {
  return updateActivity(id, { status })
}

export async function cancelActivity(id: string) {
  const supabase = await createClient()

  // 取消活動時，一併刪除自動建立的場地費用支出
  await supabase
    .from('expenses')
    .delete()
    .eq('activity_id', id)
    .eq('category', 'venue_rental')

  revalidatePath('/finance')
  return updateActivity(id, { status: 'cancelled' })
}

export async function duplicateActivity(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { data: original } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single()

  if (!original) throw new Error('找不到原始活動')

  // 複製活動設定，日期留空讓使用者在編輯頁填寫
  const { data, error } = await supabase
    .from('activities')
    .insert({
      season_id: original.season_id,
      fee_rule_id: original.fee_rule_id,
      activity_date: null,
      start_time: original.start_time,
      end_time: original.end_time,
      venue_name: original.venue_name,
      court_count: original.court_count,
      max_per_court: original.max_per_court,
      status: 'draft',
      notes: original.notes,
      created_by: member?.id ?? null,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? '複製失敗')

  await supabase.from('audit_logs').insert({
    actor_id: member?.id,
    action: 'duplicate_activity',
    entity_type: 'activity',
    entity_id: data.id,
    new_data: { source_id: id },
  })

  revalidatePath('/activities')
  redirect('/activities/' + data.id + '/edit')
}
