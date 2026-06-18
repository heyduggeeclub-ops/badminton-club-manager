'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSeason(input: {
  year: number
  quarter: number
  start_date: string
  end_date: string
}) {
  const supabase = await createClient()

  // 檢查是否已存在
  const { data: existing } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', input.year)
    .eq('quarter', input.quarter)
    .maybeSingle()

  if (existing) throw new Error(`${input.year} Q${input.quarter} 已存在`)

  const { error } = await supabase.from('seasons').insert(input)
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
  revalidatePath('/activities')
  revalidatePath('/finance')
}

export async function deleteSeason(id: string) {
  const supabase = await createClient()

  // 確認該季度沒有活動
  const { count } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', id)

  if ((count ?? 0) > 0) throw new Error('該季度已有活動，無法刪除')

  const { error } = await supabase.from('seasons').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
  revalidatePath('/activities')
  revalidatePath('/finance')
}
