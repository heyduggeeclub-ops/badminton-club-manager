import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ActivitiesClient } from './ActivitiesClient'

async function getActivities() {
  const supabase = await createClient()

  // activity_financials view 已內含 court_count, max_per_court,
  // registration_count, waitlist_count — 單一查詢取得完整資料（3 queries → 1）
  const { data: activities } = await supabase
    .from('activity_financials')
    .select('activity_id, activity_date, start_time, end_time, venue_name, court_count, max_per_court, status, registration_count, waitlist_count')
    .order('activity_date', { ascending: false })
    .limit(50)

  const rows = (activities ?? []).map(a => ({
    id: a.activity_id,
    activity_date: a.activity_date,
    start_time: a.start_time,
    end_time: a.end_time,
    venue_name: a.venue_name,
    court_count: a.court_count,
    max_per_court: a.max_per_court,
    status: a.status,
    confirmedCount: a.registration_count,
    waitlistCount:  a.waitlist_count,
  }))

  return { rows }
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
