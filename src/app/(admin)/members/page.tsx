import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MemberListClient } from './MemberListClient'
import type { Member } from '@/types'
import Link from 'next/link'
import { Plus } from 'lucide-react'

async function getMembers() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // ── Batch 1：season、會員清單、欠款 全部並行 ──────────────────────────
  const [
    { data: season },
    { data: members },
    { data: debts },
  ] = await Promise.all([
    supabase
      .from('seasons')
      .select('id')
      .lte('start_date', today)
      .gte('end_date', today)
      .single(),
    supabase
      .from('members')
      .select('*')
      .order('role', { ascending: false })
      .order('name'),
    supabase
      .from('member_debt_summary')
      .select('member_id, total_owed'),
  ])

  // ── Batch 2：出席紀錄 + 本季系統外已出席次數校正（需要 season.id，故接在 Batch 1 後）
  let attendanceCounts: Record<string, number> = {}
  if (season) {
    const [{ data: att }, { data: adjustments }] = await Promise.all([
      supabase
        .from('attendance_records')
        .select('member_id')
        .eq('season_id', season.id)
        .eq('checked_in', true),
      supabase
        .from('member_season_adjustments')
        .select('member_id, prior_attendance_count')
        .eq('season_id', season.id),
    ])
    att?.forEach(a => {
      attendanceCounts[a.member_id] = (attendanceCounts[a.member_id] ?? 0) + 1
    })
    // 併入「本季系統外已出席次數」校正，讓牌位與此頁顯示的次數跟會員詳情頁一致
    adjustments?.forEach(adj => {
      attendanceCounts[adj.member_id] = (attendanceCounts[adj.member_id] ?? 0) + adj.prior_attendance_count
    })
  }

  const debtMap: Record<string, number> = {}
  debts?.forEach(d => { debtMap[d.member_id] = d.total_owed })

  return { members: (members ?? []) as Member[], attendanceCounts, debtMap }
}

export default async function MembersPage() {
  const { members, attendanceCounts, debtMap } = await getMembers()

  const activeCount   = members.filter(m => m.status === 'active').length
  const pendingCount  = members.filter(m => m.status === 'pending').length
  const inactiveCount = members.filter(m => m.status === 'inactive').length

  // 把 attended / owed 合併進會員資料，傳給 Client Component
  const memberRows = members.map(m => ({
    ...m,
    attended: attendanceCounts[m.id] ?? 0,
    owed: debtMap[m.id] ?? 0,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="會員管理"
        description={`正式 ${activeCount} 人・待確認 ${pendingCount} 人・停用 ${inactiveCount} 人`}
        actions={
          <Link href="/members/new">
            <Button size="md">
              <Plus size={16} className="mr-1.5" />
              新增會員
            </Button>
          </Link>
        }
      />

      <Card>
        <MemberListClient members={memberRows} />
      </Card>
    </div>
  )
}
