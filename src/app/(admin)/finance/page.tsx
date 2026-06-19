import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { getSeasonLabel } from '@/lib/utils'
import { FinanceClient, type ExpenseWithActivity } from './FinanceClient'

export const dynamic = 'force-dynamic'

async function getFinanceData(selectedSeasonId?: string) {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // ── Batch 1：所有季度 + 欠款（並行，兩者互不依賴）────────────────────
  const [
    { data: allSeasons },
    { data: debtRows },
  ] = await Promise.all([
    supabase
      .from('seasons')
      .select('id, year, quarter, start_date, end_date')
      .order('year', { ascending: false })
      .order('quarter', { ascending: false }),
    supabase
      .from('member_debt_summary')
      .select('total_owed')
      .gt('total_owed', 0),
  ])

  // JS 計算：從 allSeasons 找當前季度，消除第二次 seasons 查詢
  const currentSeason = allSeasons?.find(
    s => s.start_date <= today && s.end_date >= today
  ) ?? allSeasons?.[0] ?? null

  const defaultSeasonId = currentSeason?.id
  const seasonId = selectedSeasonId ?? defaultSeasonId
  const season = allSeasons?.find(s => s.id === seasonId) ?? currentSeason

  if (!season || !seasonId) return null

  const debtTotal   = debtRows?.reduce((s, r) => s + Number(r.total_owed), 0) ?? 0
  const debtorCount = debtRows?.length ?? 0

  // ── Batch 2：所有 season_financials + 選取季度的支出 + 活動（並行）──
  const [
    { data: allSeasonFin },
    { data: expenses },
    { data: activities },
  ] = await Promise.all([
    // 一次取全部 season_financials，JS 分別過濾當季 / 累計，消除重複查詢
    supabase
      .from('season_financials')
      .select('season_id, total_income, total_expense, profit'),
    supabase
      .from('expenses')
      .select(`*, activity:activities(activity_date, venue_name)`)
      .eq('season_id', seasonId)
      .order('expense_date', { ascending: false }),
    supabase
      .from('activities')
      .select('id, activity_date, venue_name')
      .eq('season_id', seasonId)
      .order('activity_date', { ascending: false }),
  ])

  // JS 過濾：當季財務 vs 累計（不再需要第二次 season_financials 查詢）
  const seasonFin = allSeasonFin?.find(f => f.season_id === seasonId)
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
