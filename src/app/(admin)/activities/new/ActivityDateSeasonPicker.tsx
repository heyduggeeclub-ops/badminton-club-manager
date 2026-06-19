'use client'

import { useState, useEffect } from 'react'
import { Input, Select } from '@/components/ui/Input'

interface SeasonOption {
  id: string
  year: number
  quarter: number
  start_date: string
  end_date: string
}

interface Props {
  seasons: SeasonOption[]
  defaultDate: string
  defaultSeasonId?: string
}

function findSeasonForDate(seasons: SeasonOption[], date: string): SeasonOption | undefined {
  return seasons.find(s => date >= s.start_date && date <= s.end_date)
}

export function ActivityDateSeasonPicker({ seasons, defaultDate, defaultSeasonId }: Props) {
  const [date, setDate] = useState(defaultDate)
  const [seasonId, setSeasonId] = useState(defaultSeasonId ?? '')
  const [autoMatched, setAutoMatched] = useState(true)

  // 日期改變時，自動比對季度
  useEffect(() => {
    if (!date) return
    const matched = findSeasonForDate(seasons, date)
    if (matched) {
      setSeasonId(matched.id)
      setAutoMatched(true)
    } else {
      setAutoMatched(false)
    }
  }, [date, seasons])

  // 手動改季度時，標記為非自動
  function handleSeasonChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSeasonId(e.target.value)
    setAutoMatched(false)
  }

  const matchedSeason = seasons.find(s => s.id === seasonId)

  return (
    <div className="space-y-3">
      {/* 活動日期 — 全寬，iOS date input 不跑版 */}
      <div className="min-w-0 w-full">
        <Input
          label="活動日期"
          type="date"
          name="activity_date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />
      </div>

      {/* 所屬季度（跟著日期自動更新） */}
      <div className="min-w-0 w-full">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            所屬季度
            {autoMatched && matchedSeason && (
              <span className="ml-2 text-xs font-normal text-indigo-500">
                ✦ 依日期自動選取
              </span>
            )}
            {!autoMatched && (
              <span className="ml-2 text-xs font-normal text-amber-500">
                ✎ 手動選取
              </span>
            )}
          </label>
          <select
            name="season_id"
            value={seasonId}
            onChange={handleSeasonChange}
            required
            className="w-full min-w-0 bg-white px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {!seasonId && <option value="">— 請選擇 —</option>}
            {seasons.map(s => (
              <option key={s.id} value={s.id}>
                {s.year} Q{s.quarter}（{s.start_date} ~ {s.end_date}）
              </option>
            ))}
          </select>
          {!autoMatched && !matchedSeason && date && (
            <p className="text-xs text-amber-600">
              此日期不在任何季度範圍內，請手動選擇或先建立對應季度。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
