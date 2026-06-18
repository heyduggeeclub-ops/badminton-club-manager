import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatTime } from '@/lib/utils'
import { ACTIVITY_STATUS_LABELS } from '@/types'
import Link from 'next/link'
import { CheckSquare, ChevronRight } from 'lucide-react'

async function getActivitiesForAttendance() {
  const supabase = await createClient()

  // 最近 14 天範圍，涵蓋進行中 + 近期完成
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: activities } = await supabase
    .from('activities')
    .select('id, activity_date, start_time, end_time, venue_name, court_count, status')
    .or(`status.in.(open,closed),and(status.eq.completed,activity_date.gte.${twoWeeksAgo})`)
    .order('activity_date', { ascending: false })
    .limit(15)

  if (!activities || activities.length === 0) return []

  const activityIds = activities.map(a => a.id)

  const { data: regs } = await supabase
    .from('registrations')
    .select('activity_id')
    .in('activity_id', activityIds)
    .eq('status', 'confirmed')

  const { data: att } = await supabase
    .from('attendance_records')
    .select('activity_id')
    .in('activity_id', activityIds)
    .eq('checked_in', true)

  const confirmedMap: Record<string, number> = {}
  const checkedMap: Record<string, number> = {}
  regs?.forEach(r => { confirmedMap[r.activity_id] = (confirmedMap[r.activity_id] ?? 0) + 1 })
  att?.forEach(a => { checkedMap[a.activity_id] = (checkedMap[a.activity_id] ?? 0) + 1 })

  return activities.map(a => ({
    ...a,
    confirmedCount: confirmedMap[a.id] ?? 0,
    checkedCount: checkedMap[a.id] ?? 0,
  }))
}

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'gray'> = {
  open: 'info',
  closed: 'warning',
  completed: 'success',
  draft: 'gray',
}

export default async function AttendancePage() {
  const activities = await getActivitiesForAttendance()

  const upcoming = activities.filter(a => a.status !== 'completed')
  const completed = activities.filter(a => a.status === 'completed')

  return (
    <div className="space-y-5">
      <PageHeader title="出席收費" description="選擇活動開始打卡收費" />

      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-400 text-sm">目前沒有需要管理的活動</p>
          <p className="text-gray-300 text-xs mt-1">請先從「活動管理」建立活動並開放報名</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">
                進行中
              </h2>
              <div className="space-y-2">
                {upcoming.map(a => <ActivityRow key={a.id} activity={a} />)}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="mt-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">
                近期完成
              </h2>
              <div className="space-y-2 opacity-70">
                {completed.map(a => <ActivityRow key={a.id} activity={a} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ActivityRow({ activity }: {
  activity: {
    id: string
    activity_date: string
    start_time: string
    end_time: string
    venue_name: string
    court_count: number
    status: string
    confirmedCount: number
    checkedCount: number
  }
}) {
  const isCompleted = activity.status === 'completed'
  const progress = activity.confirmedCount > 0
    ? Math.min((activity.checkedCount / activity.confirmedCount) * 100, 100)
    : 0

  return (
    <Link href={`/attendance/${activity.id}`}>
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 active:bg-gray-50 transition-colors">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isCompleted ? 'bg-green-50' : 'bg-indigo-50'
        }`}>
          <CheckSquare
            size={22}
            className={isCompleted ? 'text-green-500' : 'text-indigo-500'}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-900">{formatDate(activity.activity_date)}</p>
            <p className="text-xs text-gray-500 truncate">{activity.venue_name}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatTime(activity.start_time)}–{formatTime(activity.end_time)} · {activity.court_count} 場地
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${isCompleted ? 'bg-green-400' : 'bg-indigo-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap font-medium">
              {activity.checkedCount}/{activity.confirmedCount} 人到
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={statusVariant[activity.status] ?? 'gray'}>
            {ACTIVITY_STATUS_LABELS[activity.status as keyof typeof ACTIVITY_STATUS_LABELS]}
          </Badge>
          <ChevronRight size={16} className="text-gray-300" />
        </div>
      </div>
    </Link>
  )
}
