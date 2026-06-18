'use client'

import { useState, useTransition } from 'react'
import { createSeason, deleteSeason } from '@/lib/actions/seasons'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, CalendarDays } from 'lucide-react'
import type { Season } from '@/types'

// 依 quarter 計算預設起訖日
function getDefaultDates(year: number, quarter: number) {
  const ranges: Record<number, [string, string]> = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  }
  return ranges[quarter] ?? [`${year}-01-01`, `${year}-03-31`]
}

interface Props {
  seasons: Season[]
}

export function SeasonManager({ seasons }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [quarter, setQuarter] = useState(
    // 預設下一個還沒建立的季度
    (() => {
      const existing = new Set(seasons.filter(s => s.year === new Date().getFullYear()).map(s => s.quarter))
      for (let q = 1; q <= 4; q++) if (!existing.has(q)) return q
      return 1
    })()
  )
  const [startDate, setStartDate] = useState(() => getDefaultDates(new Date().getFullYear(), 1)[0])
  const [endDate, setEndDate] = useState(() => getDefaultDates(new Date().getFullYear(), 1)[1])
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // 當年份或季度改變，自動更新日期
  function handleYearQuarterChange(newYear: number, newQuarter: number) {
    const [s, e] = getDefaultDates(newYear, newQuarter)
    setStartDate(s)
    setEndDate(e)
  }

  function handleCreate() {
    setError('')
    startTransition(async () => {
      try {
        await createSeason({ year, quarter, start_date: startDate, end_date: endDate })
        setShowForm(false)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`確定要刪除「${label}」季度嗎？（需無任何活動）`)) return
    startTransition(async () => {
      try {
        await deleteSeason(id)
      } catch (e: any) {
        alert(e.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* 現有季度列表 */}
      <div className="divide-y divide-gray-100">
        {seasons.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">尚無季度資料</p>
        )}
        {seasons.map(s => {
          const label = `${s.year} Q${s.quarter}`
          const today = new Date().toISOString().split('T')[0]
          const isCurrent = today >= s.start_date && today <= s.end_date
          const isFuture = today < s.start_date
          return (
            <div key={s.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <CalendarDays size={16} className="text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                  {isCurrent && (
                    <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">本季</span>
                  )}
                  {isFuture && (
                    <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">未來</span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{s.start_date} ～ {s.end_date}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(s.id, label)}
                disabled={isPending}
                className="p-1.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                title="刪除（需無活動）"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )
        })}
      </div>

      {/* 新增表單 */}
      {showForm ? (
        <div className="border border-indigo-100 rounded-xl p-3 bg-indigo-50/40 space-y-3 overflow-hidden">
          <p className="text-sm font-medium text-gray-700">新增季度</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-xs text-gray-500 mb-1">年份</label>
              <input
                type="number"
                value={year}
                min={2020}
                max={2099}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  setYear(v)
                  handleYearQuarterChange(v, quarter)
                }}
                className="w-full min-w-0 bg-white px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs text-gray-500 mb-1">季度</label>
              <select
                value={quarter}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  setQuarter(v)
                  handleYearQuarterChange(year, v)
                }}
                className="w-full min-w-0 bg-white px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[1, 2, 3, 4].map(q => (
                  <option key={q} value={q}>Q{q}（{['1-3月', '4-6月', '7-9月', '10-12月'][q - 1]}）</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="min-w-0">
              <Input
                label="開始日期"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <Input
                label="結束日期"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setError('') }}>
              取消
            </Button>
            <Button type="button" onClick={handleCreate} disabled={isPending}>
              {isPending ? '建立中…' : '建立季度'}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Plus size={16} />
          新增季度
        </button>
      )}
    </div>
  )
}
