'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { CreateMemberInput } from '@/types'

export async function createMember(input: CreateMemberInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: actor } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { data, error } = await supabase
    .from('members')
    .insert({
      ...input,
      // Bootstrap case: no member record exists yet → inject user_id so the
      // authenticated_create_own_member RLS policy (user_id = auth.uid()) is satisfied.
      // Normal case: actor exists → admin_all policy covers the insert, no user_id needed.
      ...(actor ? {} : { user_id: user.id }),
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    actor_id: actor?.id,
    action: 'create_member',
    entity_type: 'member',
    entity_id: data.id,
    new_data: input,
  })

  revalidatePath('/members')
  redirect(`/members/${data.id}`)
}

export async function updateMember(id: string, input: Partial<CreateMemberInput>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: actor } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { data: oldMember } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('members')
    .update(input)
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    actor_id: actor?.id,
    action: 'update_member',
    entity_type: 'member',
    entity_id: id,
    old_data: oldMember,
    new_data: input,
  })

  revalidatePath('/members')
  redirect(`/members/${id}`)
}

export async function deactivateMember(id: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: actor } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('members')
    .update({
      status: 'inactive',
      deactivated_at: new Date().toISOString(),
      deactivation_reason: reason ?? null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    actor_id: actor?.id,
    action: 'deactivate_member',
    entity_type: 'member',
    entity_id: id,
    new_data: { status: 'inactive', reason },
  })

  revalidatePath('/members')
  revalidatePath(`/members/${id}`)
}

export async function reactivateMember(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: actor } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('members')
    .update({
      status: 'active',
      deactivated_at: null,
      deactivation_reason: null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    actor_id: actor?.id,
    action: 'reactivate_member',
    entity_type: 'member',
    entity_id: id,
    new_data: { status: 'active' },
  })

  revalidatePath('/members')
  revalidatePath(`/members/${id}`)
}
