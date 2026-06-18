import { createClient } from '@/lib/supabase/server'
import { StatCard, Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDate, formatCurrency, getSeasonLabel } from '@/lib/utils'
import { ACTIVITY_STATUS_LABELS } from '@/types'
import { repayAllDebts } from '@/lib/actions/payment'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import type { ActivityFinancials, MemberDebtSummary } from '@/types'

async function getDashboardData() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const { data: season } = await supabase
    .from('seasons')
    .select('id, year, quarter')
    .lte('start_date', today)
    .gte('end_date', today)
    .single()

  if (!season) return null
  const { year, quarter } = season

  // 季度財務
  const { data: seasonFin } = await supabase
    .from('season_financials')
    .select('total_income, total_expense, profit')
    .eq('season_id', season.id)
    .single()

  // 下一場活動
  const { data: nextActivity } = await supabase
    .from('activities')
    .select('id, activity_date, start_time, end_time, venue_name, court_count, max_per_court, status')
    .in('status', ['open', 'draft'])
    .gte('activity_date', today)
    .order('activity_date', { ascending: true })
    .limit(1)
    .single()

  let confirmedCount = 0
  let waitlistCount = 0
  if (nextActivity) {
    const { count: confirmed } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', nextActivity.id)
      .eq('status', 'confirmed')
    const { count: waitlist } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', nextActivity.id)
      .eq('status', 'waitlist')
    confirmedCount = confirmed ?? 0
    waitlistCount = waitlist ?? 0
  }

  const { data: debtList } = await supabase
    .from('member_debt_summary')
    .select('*')
    .gt('total_owed', 0)
    .order('total_owed', { ascending: false })
    .limit(5)

  const { data: recentActivities } = await supabase
    .from('activity_financials')
    .select('*')
    .eq('season_id', season.id)
    .in('status', ['completed', 'cancelled'])
    .order('activity_date', { ascending: false })
    .limit(5)

  return {
    year, quarter,
    totalIncome: seasonFin?.total_income ?? 0,
    totalExpense: seasonFin?.total_expense ?? 0,
    profit: seasonFin?.profit ?? 0,
    nextActivity,
    confirmedCount,
    waitlistCount,
    debtList: (debtList ?? []) as MemberDebtSummary[],
    recentActivities: (recentActivities ?? []) as ActivityFinancials[],
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        無法取得資料，請確認資料庫連線設定。
      </div>
    )
  }

  const { year, quarter, totalIncome, totalExpense, profit,
    nextActivity, confirmedCount, waitlistCount, debtList, recentActivities } = data

  const maxCapacity = nextActivity
    ? nextActivity.court_count * nextActivity.max_per_court
    : 0

  const activityStatusVariant: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'gray'> = {
    completed: 'success',
    open:      'info',
    closed:    'warning',
    cancelled: 'danger',
    draft:     'gray',
  }

  const profitPositive = profit >= 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="總覽"
        description={`${getSeasonLabel(year, quarter)}（${['','1–3月','4–6月','7–9月','10–12月'][quarter]}）`}
      />

      {/* 財務 KPI */}
      <div className="space-y-3">
        {/* 收入 / 支出 — 2 欄，手機版對稱 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="本季球費收入"
            value={formatCurrency(totalIncome)}
            icon={<TrendingUp size={22} />}
            color="amber"
          />
          <StatCard
            label="本季支出"
            value={formatCurrency(totalExpense)}
            icon={<TrendingDown size={22} />}
            color="red"
          />
        </div>

        {/* 損益 — 全寬，視覺突出 */}
        <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between ${
          profitPositive
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${profitPositive ? 'text-green-600' : 'text-red-500'}`}>
              本季損益
            </p>
            <p className={`text-2xl font-extrabold tabular-nums mt-0.5 ${profitPositive ? 'text-green-700' : 'text-red-600'}`}>
              {profitPositive ? '+' : ''}{formatCurrency(profit)}
            </p>
          </div>
          <Link
            href="/finance"
            className={`text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              profitPositive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            財務明細 <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">下次活動</h2>
              <Link href="/activities" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                前往活動管理 <ChevronRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {nextActivity ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-900">
                    📅 {formatDate(nextActivity.activity_date)}
                    　{nextActivity.start_time.slice(0,5)}–{nextActivity.end_time.slice(0,5)}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {nextActivity.venue_name}　{nextActivity.court_count} 場地
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>正取 {confirmedCount}/{maxCapacity} 人</span>
                    <span className="text-amber-600">候補 {waitlistCount} 人</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${Math.min((confirmedCount / maxCapacity) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/attendance/${nextActivity.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    ✅ 開始出席收費
                  </Link>
                  <Link
                    href={`/activities/${nextActivity.id}`}
                    className="flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    詳情 <ChevronRight size={14} className="ml-0.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">目前沒有即將舉辦的活動</p>
            )}
          </CardBody>
        </Card>

        {/* Debt Warning */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="font-semibold text-gray-800">欠款警示</h2>
            </div>
          </CardHeader>
          <CardBody>
            {debtList.length > 0 ? (
              <div className="space-y-2">
                {debtList.map(d => {
                  const repayAction = repayAllDebts.bind(null, d.member_id, 'cash')
                  return (
                    <div key={d.member_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{d.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{d.unpaid_sessions} 筆未付</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(d.total_owed)}</span>
                        <form action={repayAction}>
                          <button
                            type="submit"
                            className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-medium hover:bg-green-200 active:bg-green-300 transition-colors"
                          >
                            補繳
                          </button>
                        </form>
                      </div>
                    </div>
                  )
                })}
                <p className="text-xs text-gray-400 pt-2">
                  共 {debtList.length} 人 / {formatCurrency(debtList.reduce((s, d) => s + d.total_owed, 0))} 待收
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">✅ 目前無欠款</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">最近活動紀錄</h2>
            <Link href="/activities" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              查看全部 <ChevronRight size={14} />
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-y border-gray-100">
              <tr>
                {['日期','場館','出席','收入','支出','損益','狀態'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentActivities.length > 0 ? recentActivities.map(a => (
                <tr key={a.activity_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-800">{formatDate(a.activity_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.venue_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.attended_count} 人</td>
                  <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(a.total_income)}</td>
                  <td className="px-4 py-3 text-sm text-red-500">{formatCurrency(a.total_expense)}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${a.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {a.profit >= 0 ? '+' : ''}{formatCurrency(a.profit)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={activityStatusVariant[a.status] ?? 'gray'}>
                      {ACTIVITY_STATUS_LABELS[a.status]}
                    </Badge>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    本季尚無完成的活動紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
