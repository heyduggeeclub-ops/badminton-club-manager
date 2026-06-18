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
}

const ENTITY_LABELS: Record<string, string> = {
  member:       '會員',
  activity:     '活動',
  attendance:   '出席',
  registration: '報名',
  payment:      '收費',
  expense:      '支出',
  fee_rule:     '收費規則',
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
                      {log.new_data && Object.keys(log.new_data).length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {JSON.stringify(log.new_data).slice(0, 80)}
                          {JSON.stringify(log.new_data).length > 80 ? '…' : ''}
                        </p>
                      )}
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
