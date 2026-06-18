import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate, formatTime, getCurrentSeason } from '@/lib/utils'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Activity, Season } from '@/types'
import { ActivitiesClient } from './ActivitiesClient'

async function getActivities() {
  const supabase = await createClient()
  const { year, quarter } = getCurrentSeason()

  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', year)
    .eq('quarter', quarter)
    .single()

  const { data: activities } = await supabase
    .from('activities')
    .select(`
      *,
      season:seasons(year, quarter)
    `)
    .order('activity_date', { ascending: false })
    .limit(50)

  // Registration counts
  const activityIds = activities?.map(a => a.id) ?? []
  let registrationCounts: Record<string, { confirmed: number; waitlist: number }> = {}

  if (activityIds.length > 0) {
    const { data: regs } = await supabase
      .from('registrations')
      .select('activity_id, status')
      .in('activity_id', activityIds)
      .in('status', ['confirmed', 'promoted', 'waitlist'])

    regs?.forEach(r => {
      if (!registrationCounts[r.activity_id]) {
        registrationCounts[r.activity_id] = { confirmed: 0, waitlist: 0 }
      }
      if (r.status === 'confirmed' || r.status === 'promoted') registrationCounts[r.activity_id].confirmed++
      if (r.status === 'waitlist') registrationCounts[r.activity_id].waitlist++
    })
  }

  const rows = (activities ?? []).map(a => ({
    id: a.id,
    activity_date: a.activity_date,
    start_time: a.start_time,
    end_time: a.end_time,
    venue_name: a.venue_name,
    court_count: a.court_count,
    max_per_court: a.max_per_court,
    status: a.status,
    confirmedCount: registrationCounts[a.id]?.confirmed ?? 0,
    waitlistCount:  registrationCounts[a.id]?.waitlist  ?? 0,
  }))

  return { rows, currentSeasonId: season?.id }
}

export default async function ActivitiesPage() {
  const { rows } = await getActivities()

  return (
    <div className="space-y-6">
      <PageHeader
        title="活動管理"
        description="建立與管理所有球隊活動"
        actions={
          <Link href="/activities/new">
            <Button size="md">
              <Plus size={16} className="mr-1.5" />
              新增活動
            </Button>
          </Link>
        }
      />

      <Card>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            尚無活動紀錄，<Link href="/activities/new" className="text-indigo-600 hover:underline">新增第一場活動</Link>
          </div>
        ) : (
          <ActivitiesClient activities={rows} />
        )}
      </Card>
    </div>
  )
}
