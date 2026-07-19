'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { AuditLog } from '@/types'

const ACTION_LABELS: Record<string, string> = {
  check_in:                 '出席打卡',
  check_out:                '取消打卡',
  create_member:            '新增會員',
  update_member:            '更新會員',
  deactivate_member:        '停用會員',
  reactivate_member:        '重啟用會員',
  create_activity:          '新增活動',
  update_activity:          '更新活動',
  cancel_activity:          '取消活動',
  duplicate_activity:       '複製活動',
  add_registration:         '新增報名',
  remove_registration:      '取消報名',
  repay_debt:               '補繳欠款',
  repay_all_debts:          '全額補繳',
  create_expense:           '新增支出',
  update_expense:           '更新支出',
  delete_expense:           '刪除支出',
  update_fee_rule_tiers:    '更新費率',
  recalculate_sequence:     '重算順序',
  set_member_season_adjustment: '出席次數校正',
}

const ENTITY_LABELS: Record<string, string> = {
  member:       '會員',
  activity:     '活動',
  attendance:   '出席',
  registration: '報名',
  payment:      '收費',
  expense:      '支出',
  fee_rule:     '收費規則',
  member_season_adjustment: '出席校正',
}

// 變更摘要的欄位中文名
const FIELD_LABELS: Record<string, string> = {
  name: '姓名', display_name: '暱稱', gender: '性別', role: '角色', status: '狀態',
  phone: '電話', line_id: 'LINE', notes: '備註', deactivation_reason: '停用原因',
  activity_date: '日期', start_time: '開始', end_time: '結束', venue_name: '場地',
  court_count: '場地數', max_per_court: '每場人數',
  amount: '金額', category: '類別', description: '說明', expense_date: '支出日期',
  prior_attendance_count: '系統外出席次數', note: '備註',
  payment_method: '付款方式', paid_amount: '實收金額',
  leader_fee: '團長費用', vice_leader_fee: '副團長費用',
  guest_fee_male: '臨打費（男）', guest_fee_female: '臨打費（女）',
  effective_from: '生效日', effective_to: '失效日', is_active: '啟用',
  attendance_from: '次數起', attendance_to: '次數迄',
  waitlist_position: '候補順位', raw_name: '原始姓名', cancelled_reason: '取消原因',
}

// 變更摘要的欄位值中文化（enum → 中文）
const VALUE_LABELS: Record<string, string> = {
  male: '男', female: '女',
  member: '會員', vice_leader: '副團長', leader: '團長', guest: '臨打',
  active: '在籍', inactive: '停用', pending: '待確認',
  draft: '草稿', open: '報名中', closed: '截止', completed: '已完成', cancelled: '已取消',
  confirmed: '已報名', waitlist: '候補', promoted: '候補晉升',
  paid: '已付', partial: '部分付款', waived: '免收',
  cash: '現金', transfer: '轉帳', other: '其他',
  venue_rental: '場地費', shuttlecock: '羽球', drinks: '飲料', prizes: '獎品',
}

// 不顯示在摘要中的技術欄位
const SKIP_FIELDS = new Set([
  'id', 'user_id', 'season_id', 'fee_rule_id', 'activity_id', 'member_id',
  'created_by', 'registered_by', 'actor_id', 'entity_id',
  'created_at', 'updated_at', 'deactivated_at', 'promoted_at', 'cancelled_at', 'registered_at',
])

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? '是' : '否'
  const s = String(v)
  return VALUE_LABELS[s] ?? s
}

/** 把 old_data / new_data 轉成人話摘要：
 *  有 old_data（更新類）→ 只列實際變動的欄位「欄位：舊 → 新」
 *  無 old_data（新增類）→ 列出有值的欄位「欄位：值」 */
function summarizeChange(log: AuditLog): string {
  const nd = log.new_data
  if (!nd || Object.keys(nd).length === 0) return ''
  const od = log.old_data
  const entries = Object.entries(nd).filter(([k]) => !SKIP_FIELDS.has(k))

  if (od && Object.keys(od).length > 0) {
    return entries
      .filter(([k, v]) => JSON.stringify(od[k] ?? null) !== JSON.stringify(v ?? null))
      .map(([k, v]) => `${FIELD_LABELS[k] ?? k}：${fmtValue(od[k])} → ${fmtValue(v)}`)
      .join('、')
  }
  return entries
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${FIELD_LABELS[k] ?? k}：${fmtValue(v)}`)
    .join('、')
}

function actionVariant(action: string): string {
  if (action.startsWith('delete') || action.startsWith('cancel') || action === 'deactivate_member') {
    return 'text-red-600 bg-red-50'
  }
  if (action.startsWith('create') || action.startsWith('add') || action === 'check_in' || action === 'reactivate_member') {
    return 'text-green-700 bg-green-50'
  }
  return 'text-blue-600 bg-blue-50'
}

function formatDateTime(ts: string) {
  const d = new Date(ts)
  const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

interface Props {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
  search: string
  dateFrom: string
  dateTo: string
  entityType: string
}

export function AuditLogsClient({ logs, total, page, pageSize, search, dateFrom, dateTo, entityType }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.ceil(total / pageSize)

  function pushParams(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = { search, dateFrom, dateTo, entityType, page: String(page), ...updates }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="space-y-4">
      {/* 篩選列 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {/* 搜尋 */}
          <input
            type="search"
            defaultValue={search}
            placeholder="搜尋操作內容…"
            className="flex-1 min-w-[160px] border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={e => pushParams({ search: e.target.value, page: '1' })}
          />

          {/* 類型篩選 */}
          <select
            value={entityType}
            onChange={e => pushParams({ entityType: e.target.value, page: '1' })}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">所有類型</option>
            {Object.entries(ENTITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-gray-500 flex-shrink-0">日期範圍：</span>
          <input
            type="date"
            defaultValue={dateFrom}
            onChange={e => pushParams({ dateFrom: e.target.value, page: '1' })}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400 text-sm">～</span>
          <input
            type="date"
            defaultValue={dateTo}
            onChange={e => pushParams({ dateTo: e.target.value, page: '1' })}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {(search || dateFrom || dateTo || entityType) && (
            <button
              onClick={() => pushParams({ search: '', dateFrom: '', dateTo: '', entityType: '', page: '1' })}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              清除篩選
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400">共 {total} 筆記錄</p>
      </div>

      {/* 記錄列表 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isPending && (
          <div className="px-5 py-3 bg-indigo-50 text-indigo-600 text-xs font-medium">載入中…</div>
        )}

        {logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">無符合條件的記錄</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {logs.map(log => {
              const { date, time } = formatDateTime(log.created_at)
              const actionLabel = ACTION_LABELS[log.action] ?? log.action
              const entityLabel = ENTITY_LABELS[log.entity_type] ?? log.entity_type
              const variant = actionVariant(log.action)

              return (
                <li key={log.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* 操作標籤 */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${variant}`}>
                      {actionLabel}
                    </span>

                    {/* 內容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {(log as any).actor?.name ?? (log as any).actor?.display_name ?? '系統'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {entityLabel}
                          {log.entity_id ? `（${log.entity_id.slice(0, 8)}…）` : ''}
                        </span>
                      </div>

                      {/* 變更摘要 */}
                      {(() => {
                        const summary = summarizeChange(log)
                        return summary ? (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2" title={summary}>
                            {summary}
                          </p>
                        ) : null
                      })()}
                    </div>

                    {/* 時間 */}
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs text-gray-500 font-medium">{time}</p>
                      <p className="text-xs text-gray-400">{date}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => pushParams({ page: String(page - 1) })}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← 上一頁
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => pushParams({ page: String(page + 1) })}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下一頁 →
          </button>
        </div>
      )}
    </div>
  )
}
