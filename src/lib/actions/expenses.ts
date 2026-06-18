'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CreateExpenseInput, ExpenseCategory } from '@/types'

async function getActor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()
  return { supabase, actorId: member?.id ?? null }
}

// ============================================================
// createExpense
// ============================================================
export async function createExpense(input: CreateExpenseInput) {
  const { supabase, actorId } = await getActor()

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...input,
      activity_id: input.activity_id || null,
      recorded_by: actorId,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? '新增失敗')

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'create_expense',
    entity_type: 'expense',
    entity_id: data.id,
    new_data: input,
  })

  revalidatePath('/finance')
  revalidatePath('/dashboard')
  if (input.activity_id) revalidatePath(`/activities/${input.activity_id}`)

  return data.id
}

// ============================================================
// updateExpense
// ============================================================
export async function updateExpense(id: string, input: Partial<CreateExpenseInput>) {
  const { supabase, actorId } = await getActor()

  const { data: old } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('expenses')
    .update({
      ...input,
      activity_id: input.activity_id || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'update_expense',
    entity_type: 'expense',
    entity_id: id,
    old_data: old,
    new_data: input,
  })

  revalidatePath('/finance')
  revalidatePath('/dashboard')
  if (old?.activity_id) revalidatePath(`/activities/${old.activity_id}`)
  if (input.activity_id) revalidatePath(`/activities/${input.activity_id}`)
}

// ============================================================
// deleteExpense
// ============================================================
export async function deleteExpense(id: string) {
  const { supabase, actorId } = await getActor()

  const { data: old } = await supabase
    .from('expenses')
    .select('activity_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'delete_expense',
    entity_type: 'expense',
    entity_id: id,
    old_data: { id },
  })

  revalidatePath('/finance')
  revalidatePath('/dashboard')
  if (old?.activity_id) revalidatePath(`/activities/${old.activity_id}`)
}
