import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Helpers
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const v = row[h]
        if (v == null) return ''
        const s = String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }).join(',')
    ),
  ]
  return lines.join('\r\n')
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse('﻿' + csv, {  // BOM for Excel UTF-8
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

const GENDER: Record<string, string> = { male: '男', female: '女' }
const ROLE: Record<string, string> = { member: '會員', vice_leader: '副團長', leader: '團長' }
const STATUS: Record<string, string> = { active: '正式', pending: '待確認', inactive: '停用' }
const PAY_STATUS: Record<string, string> = { paid: '已收', pending: '未收', partial: '部分', waived: '免除' }
const ACT_STATUS: Record<string, string> = { draft: '草稿', open: '開放', closed: '截止', completed: '完成', cancelled: '取消' }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  switch (type) {
    // ============================================================
    // 會員名冊
    // ============================================================
    case 'members': {
      const { data } = await supabase
        .from('members')
        .select('name, display_name, gender, role, status, phone, line_id, notes, created_at')
        .order('role', { ascending: false })
        .order('name')

      const rows = (data ?? []).map(m => ({
        姓名: m.name,
        暱稱: m.display_name ?? '',
        性別: GENDER[m.gender] ?? m.gender,
        角色: ROLE[m.role] ?? m.role,
        狀態: STATUS[m.status] ?? m.status,
        電話: m.phone ?? '',
        LINE_ID: m.line_id ?? '',
        備註: m.notes ?? '',
        加入日期: m.created_at.slice(0, 10),
      }))
      return csvResponse(toCSV(rows), `members_${today}.csv`)
    }

    // ============================================================
    // 活動記錄
    // ============================================================
    case 'activities': {
      const { data } = await supabase
        .from('activities')
        .select('activity_date, start_time, end_time, venue_name, court_count, max_per_court, status, notes, season:seasons(year, quarter)')
        .order('activity_date', { ascending: false })

      const rows = (data ?? []).map((a: any) => ({
        日期: a.activity_date,
        開始: a.start_time?.slice(0, 5) ?? '',
        結束: a.end_time?.slice(0, 5) ?? '',
        場館: a.venue_name,
        場地數: a.court_count,
        每場人數上限: a.max_per_court,
        總容量: a.court_count * a.max_per_court,
        狀態: ACT_STATUS[a.status] ?? a.status,
        季度: a.season ? `${a.season.year} Q${a.season.quarter}` : '',
        備註: a.notes ?? '',
      }))
      return csvResponse(toCSV(rows), `activities_${today}.csv`)
    }

    // ============================================================
    // 出席紀錄（兩步查詢，避免 RLS JOIN 問題）
    // ============================================================
    case 'attendance': {
      const { data: attRows } = await supabase
        .from('attendance_records')
        .select('member_id, activity_id, season_id, checked_in_at, season_sequence, fee_amount, paid_amount, payment_status')
        .eq('checked_in', true)
        .order('checked_in_at', { ascending: false })

      const recs = attRows ?? []

      // 批次取成員、活動、季度
      const memberIds  = [...new Set(recs.map(r => r.member_id))]
      const activityIds = [...new Set(recs.map(r => r.activity_id).filter(Boolean))]
      const seasonIds   = [...new Set(recs.map(r => r.season_id).filter(Boolean))]

      const [mRes, aRes, sRes] = await Promise.all([
        memberIds.length  ? supabase.from('members').select('id, name, gender').in('id', memberIds) : { data: [] },
        activityIds.length ? supabase.from('activities').select('id, activity_date, venue_name').in('id', activityIds) : { data: [] },
        seasonIds.length   ? supabase.from('seasons').select('id, year, quarter').in('id', seasonIds) : { data: [] },
      ])

      const mMap: Record<string, { name: string; gender: string }> = {}
      const aMap: Record<string, { activity_date: string; venue_name: string }> = {}
      const sMap: Record<string, { year: number; quarter: number }> = {}
      mRes.data?.forEach((m: any) => { mMap[m.id] = m })
      aRes.data?.forEach((a: any) => { aMap[a.id] = a })
      sRes.data?.forEach((s: any) => { sMap[s.id] = s })

      const rows = recs.map(r => ({
        出席日期: aMap[r.activity_id]?.activity_date ?? '',
        場館: aMap[r.activity_id]?.venue_name ?? '',
        姓名: mMap[r.member_id]?.name ?? '',
        性別: GENDER[mMap[r.member_id]?.gender ?? ''] ?? '',
        季度: sMap[r.season_id] ? `${sMap[r.season_id].year} Q${sMap[r.season_id].quarter}` : '',
        本季第N次: r.season_sequence ?? '',
        應收金額: r.fee_amount ?? '',
        已收金額: r.paid_amount ?? 0,
        收費狀態: PAY_STATUS[r.payment_status] ?? r.payment_status,
        打卡時間: r.checked_in_at?.slice(0, 19).replace('T', ' ') ?? '',
      }))
      return csvResponse(toCSV(rows), `attendance_${today}.csv`)
    }

    // ============================================================
    // 收費紀錄（兩步查詢 + 修正欄位名稱）
    // ============================================================
    case 'payments': {
      const { data: payRows } = await supabase
        .from('payment_transactions')
        .select('id, member_id, activity_id, amount, payment_method, type, notes, paid_at, created_at')
        .order('created_at', { ascending: false })

      const pays = payRows ?? []
      const pMemberIds  = [...new Set(pays.map(p => p.member_id).filter(Boolean))]
      const pActivityIds = [...new Set(pays.map(p => p.activity_id).filter(Boolean))]

      const [pmRes, paRes] = await Promise.all([
        pMemberIds.length  ? supabase.from('members').select('id, name').in('id', pMemberIds) : { data: [] },
        pActivityIds.length ? supabase.from('activities').select('id, activity_date, venue_name').in('id', pActivityIds) : { data: [] },
      ])
      const pmMap: Record<string, { name: string }> = {}
      const paMap: Record<string, { activity_date: string; venue_name: string }> = {}
      pmRes.data?.forEach((m: any) => { pmMap[m.id] = m })
      paRes.data?.forEach((a: any) => { paMap[a.id] = a })

      const methodLabel: Record<string, string> = { cash: '現金', transfer: '轉帳', other: '其他' }
      const typeLabel: Record<string, string> = { payment: '當場收費', debt_repayment: '補繳' }

      const rows = pays.map(p => ({
        日期: p.paid_at?.slice(0, 10) ?? p.created_at?.slice(0, 10) ?? '',
        姓名: pmMap[p.member_id]?.name ?? '',
        活動日期: paMap[p.activity_id]?.activity_date ?? '',
        場館: paMap[p.activity_id]?.venue_name ?? '',
        金額: p.amount,
        方式: methodLabel[p.payment_method] ?? p.payment_method ?? '',
        類型: typeLabel[p.type] ?? p.type,
        備註: p.notes ?? '',
      }))
      return csvResponse(toCSV(rows), `payments_${today}.csv`)
    }

    // ============================================================
    // 欠款清單
    // ============================================================
    case 'debts': {
      const { data } = await supabase
        .from('member_debt_summary')
        .select('*')
        .gt('total_owed', 0)
        .order('total_owed', { ascending: false })

      // 再撈會員姓名
      const memberIds = (data ?? []).map((d: any) => d.member_id)
      let memberMap: Record<string, { name: string; gender: string }> = {}
      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .from('members')
          .select('id, name, gender')
          .in('id', memberIds)
        members?.forEach(m => { memberMap[m.id] = { name: m.name, gender: m.gender } })
      }

      const rows = (data ?? []).map((d: any) => ({
        姓名: memberMap[d.member_id]?.name ?? d.member_id,
        性別: GENDER[memberMap[d.member_id]?.gender] ?? '',
        欠款總額: d.total_owed,
        欠款場次數: d.unpaid_sessions,
      }))
      return csvResponse(toCSV(rows), `debts_${today}.csv`)
    }

    // ============================================================
    // 財務支出明細（所有季度）
    // ============================================================
    case 'finances': {
      const { data: expRows } = await supabase
        .from('expenses')
        .select('season_id, activity_id, category, amount, description, expense_date, notes')
        .order('expense_date', { ascending: false })

      const exps = expRows ?? []
      const expSeasonIds   = [...new Set(exps.map(e => e.season_id).filter(Boolean))]
      const expActivityIds = [...new Set(exps.map(e => e.activity_id).filter(Boolean))]

      const [esRes, eaRes] = await Promise.all([
        expSeasonIds.length   ? supabase.from('seasons').select('id, year, quarter').in('id', expSeasonIds) : { data: [] },
        expActivityIds.length ? supabase.from('activities').select('id, activity_date, venue_name').in('id', expActivityIds) : { data: [] },
      ])
      const esMap: Record<string, { year: number; quarter: number }> = {}
      const eaMap: Record<string, { activity_date: string; venue_name: string }> = {}
      esRes.data?.forEach((s: any) => { esMap[s.id] = s })
      eaRes.data?.forEach((a: any) => { eaMap[a.id] = a })

      const CATEGORY: Record<string, string> = {
        venue_rental: '場租', shuttlecock: '羽球', drinks: '飲料', prizes: '獎品', other: '其他',
      }

      const rows = exps.map(e => ({
        季度: esMap[e.season_id] ? `${esMap[e.season_id].year} Q${esMap[e.season_id].quarter}` : '',
        日期: e.expense_date,
        類型: CATEGORY[e.category] ?? e.category,
        說明: e.description,
        金額: e.amount,
        關聯活動: eaMap[e.activity_id]?.activity_date
          ? `${eaMap[e.activity_id].activity_date} ${eaMap[e.activity_id].venue_name}`
          : '',
        備註: e.notes ?? '',
      }))
      return csvResponse(toCSV(rows), `finances_${today}.csv`)
    }

    // ============================================================
    // 財務季度彙總
    // ============================================================
    case 'finance-summary': {
      const { data: sfRows } = await supabase
        .from('season_financials')
        .select('year, quarter, total_income, total_expense, profit')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false })

      const sfList = sfRows ?? []
      const rows = sfList.map(s => ({
        季度: `${s.year} Q${s.quarter}`,
        收入: s.total_income,
        支出: s.total_expense,
        結餘: s.profit,
      }))

      // 加一列合計
      const total = sfList.reduce(
        (acc, s) => ({
          income: acc.income + Number(s.total_income),
          expense: acc.expense + Number(s.total_expense),
          profit: acc.profit + Number(s.profit),
        }),
        { income: 0, expense: 0, profit: 0 }
      )
      rows.push({ 季度: '總計', 收入: total.income, 支出: total.expense, 結餘: total.profit })

      return csvResponse(toCSV(rows), `finance_summary_${today}.csv`)
    }

    default:
      return NextResponse.json({ error: '不支援的匯出類型' }, { status: 400 })
  }
}
