'use client'

import { useState } from 'react'
import { ActivityStatusBadge } from '@/components/activities/ActivityStatusBadge'
import { formatDate, formatTime } from '@/lib/utils'
import type { ActivityStatus } from '@/types'
import Link from 'next/link'
import { Search, X, MapPin, Clock, Users } from 'lucide-react'

interface ActivityRow {
  id: string
  activity_date: string
  start_time: string
  end_time: string
  venue_name: string
  court_count: number
  max_per_court: number
  status: ActivityStatus
  confirmedCount: number
  waitlistCount: number
}

interface Props {
  activities: ActivityRow[]
}

export function ActivitiesClient({ activities }: Props) {
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filtered = q
    ? activities.filter(a =>
        a.venue_name.toLowerCase().includes(q) ||
        a.activity_date.includes(q) ||
        formatDate(a.activity_date).includes(q)
      )
    : activities

  return (
    <div>
      {/* 搜尋框 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 max-w-sm">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋場館名稱或日期…"
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        {q && (
          <p className="text-xs text-gray-400 mt-1.5">
            找到 {filtered.length} 場活動
          </p>
        )}
      </div>

      {/* ── 手機版：卡片列表 ── */}
      <div className="md:hidden divide-y divide-gray-100">
        {filtered.length > 0 ? filtered.map(activity => {
          const maxCapacity = activity.court_count * activity.max_per_court
          return (
            <div key={activity.id} className="px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
              {/* 第一行：日期 + 狀態 */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-900">
                  {formatDate(activity.activity_date)}
                </span>
                <ActivityStatusBadge status={activity.status} />
              </div>

              {/* 第二行：場館 + 時間 */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-gray-400" />
                  {activity.venue_name}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-gray-400" />
                  {formatTime(activity.start_time)}–{formatTime(activity.end_time)}
                </span>
              </div>

              {/* 第三行：場地數 + 報名數 + 操作 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{activity.court_count} 場地</span>
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-gray-400" />
                    <span className="font-medium text-gray-700">{activity.confirmedCount}</span>
                    <span className="text-gray-400">/{maxCapacity}</span>
                    {activity.waitlistCount > 0 && (
                      <span className="ml-1 text-amber-600">候補 {activity.waitlistCount}</span>
                    )}
                  </span>
                </div>
                <Link
                  href={`/activities/${activity.id}`}
                  className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {activity.status === 'completed' || activity.status === 'cancelled' ? '查看' : '管理'}
                </Link>
              </div>
            </div>
          )
        }) : (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            {q ? `找不到「${search}」的活動` : '尚無活動紀錄'}
          </div>
        )}
      </div>

      {/* ── 桌面版：表格 ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-y border-gray-100">
            <tr>
              {['日期', '時間', '場館', '場地', '報名人數', '狀態', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length > 0 ? filtered.map(activity => {
              const maxCapacity = activity.court_count * activity.max_per_court
              return (
                <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatDate(activity.activity_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatTime(activity.start_time)}–{formatTime(activity.end_time)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{activity.venue_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{activity.court_count} 場</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="font-medium">{activity.confirmedCount}</span>
                    <span className="text-gray-400">/{maxCapacity}</span>
                    {activity.waitlistCount > 0 && (
                      <span className="ml-2 text-amber-600 text-xs">候補 {activity.waitlistCount}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ActivityStatusBadge status={activity.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/activities/${activity.id}`}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      {activity.status === 'completed' || activity.status === 'cancelled' ? '查看' : '管理'}
                    </Link>
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  {q ? `找不到「${search}」的活動` : '尚無活動紀錄'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
