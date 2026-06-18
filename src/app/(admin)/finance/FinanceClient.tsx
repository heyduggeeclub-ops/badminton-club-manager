'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { createExpense, updateExpense, deleteExpense } from '@/lib/actions/expenses'
import {
  EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_EMOJI,
  type Expense, type ExpenseCategory,
} from '@/types'
import {
  Plus, Pencil, Trash2, X, TrendingUp, TrendingDown,
  Scale, AlertCircle,
} from 'lucide-react'

// ================================================================
// Types
// ================================================================
export interface FinanceSummary {
  income: number
  expense: number
  profit: number
  debtTotal: number
  debtorCount: number
}

export interface ActivityOption {
  id: string
  activity_date: string
  venue_name: string
}

export interface ExpenseWithActivity extends Expense {
  activity?: { activity_date: string; venue_name: string } | null
}

export interface SeasonOption {
  id: string
  year: number
  quarter: number
}

export interface CumulativeSummary {
  income: number
  expense: number
  profit: number
}

interface Props {
  seasonId: string
  summary: FinanceSummary
  expenses: ExpenseWithActivity[]
  activities: ActivityOption[]
  seasonLabel: string
  allSeasons: SeasonOption[]
  selectedSeasonId: string
  cumulative: CumulativeSummary
}

const CATEGORIES: ExpenseCategory[] = ['venue_rental', 'shuttlecock', 'drinks', 'prizes', 'other']

// ================================================================
// FinanceClient
// ================================================================
export function FinanceClient({
  seasonId, summary, expenses: initialExpenses, activities, seasonLabel,
  allSeasons, selectedSeasonId, cumulative,
}: Props) {
  const router = useRouter()
  const [expenses, setExpenses] = useState<ExpenseWithActivity[]>(initialExpenses)
  const [form, setForm] = useState<'new' | ExpenseWithActivity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseWithActivity | null>(null)
  const [isPending, startTransition] = useTransition()

  // 計算本地 summary（樂觀更新用）
  const localExpenseTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const localProfit = summary.income - localExpenseTotal

  function openNew() {
    setForm('new')
  }

  function openEdit(e: ExpenseWithActivity) {
    setForm(e)
  }

  function closeForm() {
    setForm(null)
  }

  function handleSubmit(data: {
    expense_date: string
    category: ExpenseCategory
    amount: number
    description: string
    activity_id: string | null
    notes: string
  }) {
    if (form === 'new') {
      // 樂觀新增
      const tempId = `temp-${Date.now()}`
      const act = activities.find(a => a.id === data.activity_id) ?? null
      const optimistic: ExpenseWithActivity = {
        id: tempId,
        season_id: seasonId,
        activity_id: data.activity_id,
        recorded_by: null,
        category: data.category,
        amount: data.amount,
        description: data.description,
        expense_date: data.expense_date,
        receipt_url: null,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        activity: act ? { activity_date: act.activity_date, venue_name: act.venue_name } : null,
      }
      setExpenses(prev => [optimistic, ...prev])
      setForm(null)

      startTransition(async () => {
        try {
          const newId = await createExpense({
            season_id: seasonId,
            activity_id: data.activity_id,
            category: data.category,
            amount: data.amount,
            description: data.description,
            expense_date: data.expense_date,
            notes: data.notes || null,
          })
          setExpenses(prev => prev.map(e => e.id === tempId ? { ...e, id: newId } : e))
        } catch {
          setExpenses(prev => prev.filter(e => e.id !== tempId))
        }
      })
    } else if (form) {
      // 樂觀更新
      const act = activities.find(a => a.id === data.activity_id) ?? null
      const updated: ExpenseWithActivity = {
        ...form,
        ...data,
        activity: act ? { activity_date: act.activity_date, venue_name: act.venue_name } : null,
      }
      setExpenses(prev => prev.map(e => e.id === form.id ? updated : e))
      setForm(null)

      startTransition(async () => {
        try {
          await updateExpense(form.id, {
            category: data.category,
            amount: data.amount,
            description: data.description,
            expense_date: data.expense_date,
            activity_id: data.activity_id,
            notes: data.notes || null,
          })
        } catch {
          setExpenses(prev => prev.map(e => e.id === form.id ? form : e))
        }
      })
    }
  }

  function handleDelete(expense: ExpenseWithActivity) {
    setDeleteTarget(expense)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setExpenses(prev => prev.filter(e => e.id !== target.id))
    setDeleteTarget(null)

    startTransition(async () => {
      try {
        await deleteExpense(target.id)
      } catch {
        setExpenses(prev => [target, ...prev])
      }
    })
  }

  return (
    <div className="space-y-5">

      {/* 累計至今 */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-4 text-white">
        <p className="text-xs text-indigo-200 font-medium mb-3">累計至今（所有季度）</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-base font-extrabold tabular-nums leading-none">
              {formatCurrency(cumulative.income)}
            </p>
            <p className="text-xs text-indigo-200 mt-1">總收入</p>
          </div>
          <div>
            <p className="text-base font-extrabold tabular-nums leading-none">
              {formatCurrency(cumulative.expense)}
            </p>
            <p className="text-xs text-indigo-200 mt-1">總支出</p>
          </div>
          <div>
            <p className={cn(
              'text-base font-extrabold tabular-nums leading-none',
              cumulative.profit >= 0 ? 'text-white' : 'text-red-300'
            )}>
              {cumulative.profit >= 0 ? '+' : ''}{formatCurrency(cumulative.profit)}
            </p>
            <p className="text-xs text-indigo-200 mt-1">總結餘</p>
          </div>
        </div>
      </div>

      {/* 季度選擇器 */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">查看季度</label>
        <select
          value={selectedSeasonId}
          onChange={e => router.push(`/finance?season=${e.target.value}`)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {allSeasons.map(s => (
            <option key={s.id} value={s.id}>
              {s.year} Q{s.quarter}
            </option>
          ))}
        </select>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label={`${seasonLabel} 收入`} value={formatCurrency(summary.income)} color="green" icon="up" />
        <KpiCard label={`${seasonLabel} 支出`} value={formatCurrency(localExpenseTotal)} color="red" icon="down" />
        <KpiCard
          label={`${seasonLabel} 結餘`}
          value={(localProfit >= 0 ? '+' : '') + formatCurrency(localProfit)}
          color={localProfit >= 0 ? 'indigo' : 'red'}
          icon="balance"
        />
        <div className="bg-white rounded-2xl border border-gray-200 p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle size={14} className="text-amber-500" />
            <span className="text-xs text-gray-500 font-medium">欠款</span>
          </div>
          <p className="text-lg font-extrabold text-red-600 tabular-nums leading-none">
            {formatCurrency(summary.debtTotal)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{summary.debtorCount} 人未結清</p>
        </div>
      </div>

      {/* 支出管理 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">
            {seasonLabel} 支出
            <span className="ml-2 text-sm font-normal text-gray-400">{expenses.length} 筆</span>
          </h2>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            <Plus size={15} />
            新增支出
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-3xl mb-2">💰</p>
            <p className="text-sm text-gray-400">尚無支出記錄</p>
            <button onClick={openNew} className="mt-3 text-sm text-indigo-600 font-medium hover:underline">
              + 新增第一筆支出
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(expense => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onEdit={() => openEdit(expense)}
                onDelete={() => handleDelete(expense)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部 Add/Edit 表單 */}
      {form !== null && (
        <ExpenseFormSheet
          expense={form === 'new' ? null : form}
          seasonId={seasonId}
          activities={activities}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {/* Delete 確認 */}
      {deleteTarget && (
        <DeleteConfirm
          expense={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ================================================================
// KpiCard
// ================================================================
function KpiCard({ label, value, color, icon }: {
  label: string
  value: string
  color: 'green' | 'red' | 'indigo'
  icon: 'up' | 'down' | 'balance'
}) {
  const colorMap = {
    green: { text: 'text-green-600', bg: 'bg-green-50', icon: 'text-green-500' },
    red: { text: 'text-red-600', bg: 'bg-red-50', icon: 'text-red-500' },
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50', icon: 'text-indigo-500' },
  }
  const c = colorMap[color]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={cn('w-5 h-5 rounded flex items-center justify-center', c.bg)}>
          {icon === 'up' && <TrendingUp size={12} className={c.icon} />}
          {icon === 'down' && <TrendingDown size={12} className={c.icon} />}
          {icon === 'balance' && <Scale size={12} className={c.icon} />}
        </div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className={cn('text-lg font-extrabold tabular-nums leading-none', c.text)}>{value}</p>
    </div>
  )
}

// ================================================================
// ExpenseRow
// ================================================================
function ExpenseRow({ expense, onEdit, onDelete }: {
  expense: ExpenseWithActivity
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
        {EXPENSE_CATEGORY_EMOJI[expense.category as ExpenseCategory] ?? '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 leading-tight truncate">
          {expense.description}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {EXPENSE_CATEGORY_LABELS[expense.category as ExpenseCategory]}
          {' · '}
          {formatDate(expense.expense_date)}
          {expense.activity && (
            <span className="ml-1 text-indigo-400">
              · {expense.activity.venue_name}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-bold text-sm text-red-600 tabular-nums">
          {formatCurrency(expense.amount)}
        </span>
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ================================================================
// ExpenseFormSheet — 底部滑出表單
// ================================================================
function ExpenseFormSheet({ expense, seasonId, activities, onSubmit, onClose }: {
  expense: ExpenseWithActivity | null
  seasonId: string
  activities: ActivityOption[]
  onSubmit: (data: {
    expense_date: string
    category: ExpenseCategory
    amount: number
    description: string
    activity_id: string | null
    notes: string
  }) => void
  onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(expense?.expense_date ?? today)
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'other')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [activityId, setActivityId] = useState(expense?.activity_id ?? '')
  const [notes, setNotes] = useState(expense?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseInt(amount)
    if (!description.trim() || !amt || amt <= 0) return
    onSubmit({
      expense_date: date,
      category,
      amount: amt,
      description: description.trim(),
      activity_id: activityId || null,
      notes: notes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[90dvh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-2 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-base">
            {expense ? '編輯支出' : '新增支出'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-4">
          {/* 類型選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">支出類型</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all',
                    category === cat
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  <span className="text-lg leading-none">{EXPENSE_CATEGORY_EMOJI[cat]}</span>
                  <span>{EXPENSE_CATEGORY_LABELS[cat]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 金額 + 日期 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金額</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  required
                  min={1}
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 說明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">說明</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="例：大安運動中心 3 場地 2 小時"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 關聯活動 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              關聯活動
              <span className="ml-1 text-gray-400 font-normal">（選填）</span>
            </label>
            <select
              value={activityId}
              onChange={e => setActivityId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">不關聯特定活動</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  {formatDate(a.activity_date)} · {a.venue_name}
                </option>
              ))}
            </select>
          </div>

          {/* 備註 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備註
              <span className="ml-1 text-gray-400 font-normal">（選填）</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="其他說明"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            {expense ? '儲存變更' : '新增支出'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ================================================================
// DeleteConfirm
// ================================================================
function DeleteConfirm({ expense, onConfirm, onCancel }: {
  expense: ExpenseWithActivity
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl">
        <div className="text-center">
          <div className="text-4xl mb-3">🗑️</div>
          <h3 className="font-bold text-gray-900 mb-1">刪除支出</h3>
          <p className="text-sm text-gray-500 mb-1">{expense.description}</p>
          <p className="text-lg font-bold text-red-600 mb-5">{formatCurrency(expense.amount)}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 active:bg-red-700"
            >
              確認刪除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
