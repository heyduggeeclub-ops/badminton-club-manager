import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { getSeasonLabel } from '@/lib/utils'
import { FinanceClient, type ExpenseWithActivity } from './FinanceClient'

export const dynamic = 'force-dynamic'

async function getFinanceData(selectedSeasonId?: string) {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // 所有季度（倒序）
  const { data: allSeasons } = await supabase
    .from('seasons')
    .select('id, year, quarter')
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })

  // 當前季度（預設）
  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id, year, quarter')
    .lte('start_date', today)
    .gte('end_date', today)
    .single()

  const defaultSeasonId = currentSeason?.id ?? allSeasons?.[0]?.id
  const seasonId = selectedSeasonId ?? defaultSeasonId
  const season = allSeasons?.find(s => s.id === seasonId) ?? currentSeason

  if (!season || !seasonId) return null

  // 選取季度的財務彙總
  const { data: seasonFin } = await supabase
    .from('season_financials')
    .select('total_income, total_expense, profit')
    .eq('season_id', seasonId)
    .single()

  // 欠款（全域，不限季度）
  const { data: debtRows } = await supabase
    .from('member_debt_summary')
    .select('total_owed')
    .gt('total_owed', 0)

  const debtTotal = debtRows?.reduce((s, r) => s + Number(r.total_owed), 0) ?? 0
  const debtorCount = debtRows?.length ?? 0

  // 選取季度的支出
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      *,
      activity:activities(activity_date, venue_name)
    `)
    .eq('season_id', seasonId)
    .order('expense_date', { ascending: false })

  // 選取季度的活動（支出表單用）
  const { data: activities } = await supabase
    .from('activities')
    .select('id, activity_date, venue_name')
    .eq('season_id', seasonId)
    .order('activity_date', { ascending: false })

  // 所有季度累計
  const { data: allSeasonFin } = await supabase
    .from('season_financials')
    .select('total_income, total_expense, profit')

  const cumulative = {
    income:  allSeasonFin?.reduce((s, r) => s + Number(r.total_income),  0) ?? 0,
    expense: allSeasonFin?.reduce((s, r) => s + Number(r.total_expense), 0) ?? 0,
    profit:  allSeasonFin?.reduce((s, r) => s + Number(r.profit),        0) ?? 0,
  }

  return {
    season,
    seasonId,
    allSeasons: (allSeasons ?? []).map(s => ({ id: s.id, year: s.year, quarter: s.quarter })),
    summary: {
      income:      seasonFin?.total_income  ?? 0,
      expense:     seasonFin?.total_expense ?? 0,
      profit:      seasonFin?.profit        ?? 0,
      debtTotal,
      debtorCount,
    },
    expenses:   (expenses ?? []) as ExpenseWithActivity[],
    activities: (activities ?? []).map(a => ({
      id:            a.id,
      activity_date: a.activity_date,
      venue_name:    a.venue_name,
    })),
    cumulative,
  }
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>
}) {
  const { season: seasonParam } = await searchParams
  const data = await getFinanceData(seasonParam)

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        無法取得季度資料，請確認資料庫設定。
      </div>
    )
  }

  const { season, seasonId, allSeasons, summary, expenses, activities, cumulative } = data
  const seasonLabel = getSeasonLabel(season.year, season.quarter)

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="財務管理"
        description="各季收支記錄與歷史財務統計"
      />

      <FinanceClient
        key={seasonId}
        seasonId={seasonId}
        summary={summary}
        expenses={expenses}
        activities={activities}
        seasonLabel={seasonLabel}
        allSeasons={allSeasons}
        selectedSeasonId={seasonId}
        cumulative={cumulative}
      />
    </div>
  )
}
