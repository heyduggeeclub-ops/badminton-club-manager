import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatTime } from '@/lib/utils'
import { ACTIVITY_STATUS_LABELS } from '@/types'
import Link from 'next/link'
import { ClipboardList, ChevronRight, Users } from 'lucide-react'

async function getActivitiesForRegistration() {
  const supabase = await createClient()

  // 顯示 open/draft 活動（可以管理報名名單的狀態）
  const { data: activities } = await supabase
    .from('activities')
    .select('id, activity_date, start_time, end_time, venue_name, court_count, max_per_court, status')
    .in('status', ['open', 'draft', 'closed'])
    .order('activity_date', { ascending: true })
    .limit(20)

  if (!activities || activities.length === 0) return []

  const activityIds = activities.map(a => a.id)

  // 每場活動的報名人數
  const { data: regs } = await supabase
    .from('registrations')
    .select('activity_id')
    .in('activity_id', activityIds)
    .in('status', ['confirmed', 'promoted'])

  const regCountMap: Record<string, number> = {}
  regs?.forEach(r => { regCountMap[r.activity_id] = (regCountMap[r.activity_id] ?? 0) + 1 })

  return activities.map(a => ({
    ...a,
    confirmedCount: regCountMap[a.id] ?? 0,
    maxCapacity: a.court_count * a.max_per_court,
  }))
}

const statusVariant: Record<string, 'info' | 'warning' | 'gray'> = {
  open: 'info',
  draft: 'gray',
  closed: 'warning',
}

export default async function RegistrationsPage() {
  const activities = await getActivitiesForRegistration()

  return (
    <div className="space-y-5">
      <PageHeader title="報名管理" description="選擇活動管理報名名單" />

      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-400 text-sm">目前沒有開放報名的活動</p>
          <p className="text-gray-300 text-xs mt-1">請先從「活動管理」建立活動</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map(a => {
            const isFull = a.confirmedCount >= a.maxCapacity
            const isOver = a.confirmedCount > a.maxCapacity
            return (
              <Link key={a.id} href={`/registrations/${a.id}`}>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 active:bg-gray-50 transition-colors">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isOver ? 'bg-red-50' : isFull ? 'bg-amber-50' : 'bg-indigo-50'
                  }`}>
                    <ClipboardList size={22} className={
                      isOver ? 'text-red-500' : isFull ? 'text-amber-500' : 'text-indigo-500'
                    } />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900">{formatDate(a.activity_date)}</p>
                      <p className="text-xs text-gray-500 truncate">{a.venue_name}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatTime(a.start_time)}–{formatTime(a.end_time)} · {a.court_count} 場地
                    </p>
                    {/* 報名進度條 */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isOver ? 'bg-red-400' : isFull ? 'bg-amber-400' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min((a.confirmedCount / a.maxCapacity) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium whitespace-nowrap ${
                        isOver ? 'text-red-600' : isFull ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {a.confirmedCount}/{a.maxCapacity} 人
                        {isOver && ' ⚠️'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={statusVariant[a.status] ?? 'gray'}>
                      {ACTIVITY_STATUS_LABELS[a.status as keyof typeof ACTIVITY_STATUS_LABELS]}
                    </Badge>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
