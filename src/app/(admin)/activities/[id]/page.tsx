import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ActivityStatusBadge } from '@/components/activities/ActivityStatusBadge'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { GENDER_LABELS } from '@/types'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, CheckSquare, Copy } from 'lucide-react'
import { updateActivityStatus, cancelActivity, duplicateActivity } from '@/lib/actions/activities'
import type { Registration, AttendanceRecord, ActivityFinancials } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  noStore()
  const { id } = await params
  const supabase = await createClient()

  // ── Batch 1：activity、registrations、financials 全部並行（只需 id）──
  const [
    { data: activity },
    { data: regs },
    { data: financials },
  ] = await Promise.all([
    supabase
      .from('activities')
      .select('*, season:seasons(year, quarter), fee_rule:fee_rules(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('registrations')
      .select('id, member_id, status, waitlist_position, registered_at')
      .eq('activity_id', id)
      .in('status', ['confirmed', 'promoted', 'waitlist'])
      .order('registered_at', { ascending: true }),
    supabase
      .from('activity_financials')
      .select('*')
      .eq('activity_id', id)
      .single(),
  ])

  if (!activity) notFound()

  // ── Batch 2：members（需要 regs 的 memberIds）─────────────────────
  const memberIds = [...new Set((regs ?? []).map(r => r.member_id))]

  let memberMap: Record<string, { name: string; gender: string }> = {}
  if (memberIds.length > 0) {
    const { data: memberRows } = await supabase
      .from('members')
      .select('id, name, gender')
      .in('id', memberIds)
      .in('status', ['active', 'pending'])
    memberRows?.forEach(m => { memberMap[m.id] = { name: m.name, gender: m.gender } })
  }

  const registrations = (regs ?? []).map(r => ({
    ...r,
    member: memberMap[r.member_id] ?? null,
  }))

  const confirmed = registrations.filter(r => r.status === 'confirmed' || r.status === 'promoted')
  const waitlist  = registrations.filter(r => r.status === 'waitlist')

  const maxCapacity = activity.court_count * activity.max_per_court

  // Status update action
  async function handleStatusChange(formData: FormData) {
    'use server'
    const newStatus = formData.get('status') as string
    if (newStatus) await updateActivityStatus(id, newStatus as any)
  }

  async function handleCancel() {
    'use server'
    await cancelActivity(id)
  }

  async function handleDuplicate() {
    'use server'
    await duplicateActivity(id)
  }

  const isEditable = !['completed', 'cancelled'].includes(activity.status)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/activities" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <PageHeader
          title={`${formatDate(activity.activity_date)} ${activity.venue_name}`}
          description={`${formatTime(activity.start_time)}–${formatTime(activity.end_time)} ・ ${activity.court_count} 場地 ・ 上限 ${maxCapacity} 人`}
          actions={
            <div className="flex items-center gap-2">
              <ActivityStatusBadge status={activity.status} />
              {isEditable && (
                <Link href={`/activities/${id}/edit`}>
                  <Button variant="secondary" size="sm">編輯</Button>
                </Link>
              )}
            </div>
          }
        />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{confirmed.length}</p>
          <p className="text-xs text-gray-500 mt-1">正取人數</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{waitlist.length}</p>
          <p className="text-xs text-gray-500 mt-1">候補人數</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{financials?.attended_count ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">實際出席</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{formatCurrency(financials?.profit ?? 0)}</p>
          <p className="text-xs text-gray-500 mt-1">活動損益</p>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardBody className="flex flex-wrap gap-3">
          {isEditable && (
            <>
              <Link href={`/registrations/${id}`}>
                <Button variant="secondary" size="sm">
                  <ClipboardList size={15} className="mr-1.5" />
                  前往報名管理
                </Button>
              </Link>
              <Link href={`/attendance?activity=${id}`}>
                <Button variant="secondary" size="sm">
                  <CheckSquare size={15} className="mr-1.5" />
                  前往出席收費
                </Button>
              </Link>

              {/* Status change */}
              <form action={handleStatusChange} className="flex items-center gap-2">
                <select
                  name="status"
                  defaultValue={activity.status}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="draft">草稿</option>
                  <option value="open">開放報名</option>
                  <option value="closed">截止報名</option>
                  <option value="completed">完成</option>
                </select>
                <Button type="submit" variant="secondary" size="sm">更新狀態</Button>
              </form>

              <form action={handleCancel}>
                <Button type="submit" variant="danger" size="sm">取消活動</Button>
              </form>
            </>
          )}

          {/* 複製按鈕：所有狀態皆可使用 */}
          <form action={handleDuplicate}>
            <Button type="submit" variant="secondary" size="sm">
              <Copy size={14} className="mr-1.5" />
              複製活動
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Registration List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confirmed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                正取名單
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {confirmed.length}/{maxCapacity} 人
                </span>
              </h2>
              {isEditable && (
                <Link href={`/registrations/${id}`}>
                  <Button variant="ghost" size="sm">管理</Button>
                </Link>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Math.min((confirmed.length / maxCapacity) * 100, 100)}%` }}
              />
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {confirmed.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {confirmed.map((reg, idx) => (
                  <li key={reg.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                    <span className="text-sm font-medium text-gray-800 flex-1">
                      {reg.member?.name}
                    </span>
                    <Badge variant={reg.member?.gender === 'male' ? 'info' : 'warning'}>
                      {GENDER_LABELS[reg.member?.gender as 'male' | 'female']}
                    </Badge>
                    {reg.status === 'promoted' && (
                      <Badge variant="success">遞補</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">尚無報名</p>
            )}
          </CardBody>
        </Card>

        {/* Waitlist */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">
              候補名單
              <span className="ml-2 text-sm font-normal text-gray-500">{waitlist.length} 人</span>
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {waitlist.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {waitlist.map((reg, idx) => (
                  <li key={reg.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs text-amber-500 font-medium w-5">{idx + 1}</span>
                    <span className="text-sm font-medium text-gray-800 flex-1">
                      {reg.member?.name}
                    </span>
                    <Badge variant={reg.member?.gender === 'male' ? 'info' : 'warning'}>
                      {GENDER_LABELS[reg.member?.gender as 'male' | 'female']}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">無候補</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Financials — 所有狀態都顯示 */}
      {financials && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">活動損益</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">球費收入</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(financials.total_income)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">活動支出</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(financials.total_expense)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">損益</p>
                <p className={`text-xl font-bold ${financials.profit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  {financials.profit >= 0 ? '+' : ''}{formatCurrency(financials.profit)}
                </p>
              </div>
            </div>
            {financials.total_expense === 0 && (
              <p className="text-xs text-gray-400 text-center mt-3">
                尚無支出記錄·可至
                <a href="/finance" className="text-indigo-500 hover:underline mx-1">財務管理</a>
                新增關聯此活動的支出
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Notes */}
      {activity.notes && (
        <Card>
          <CardBody>
            <p className="text-xs text-gray-500 mb-1">備註</p>
            <p className="text-sm text-gray-700">{activity.notes}</p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
