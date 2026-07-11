'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { TierBadge } from '@/components/ui/TierBadge'
import { formatCurrency } from '@/lib/utils'
import { GENDER_LABELS, ROLE_LABELS, STATUS_LABELS, type Member } from '@/types'
import Link from 'next/link'
import { Search, X } from 'lucide-react'

interface MemberRow extends Member {
  attended: number
  owed: number
}

interface Props {
  members: MemberRow[]
}

const statusVariant: Record<string, 'success' | 'warning' | 'gray'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'gray',
}

const roleVariant: Record<string, 'default' | 'info' | 'gray' | 'warning'> = {
  leader: 'default',
  vice_leader: 'info',
  member: 'gray',
  guest: 'warning',
}

type StatusTab = 'all' | 'active' | 'inactive'

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all',      label: '全部' },
  { key: 'active',   label: '在籍' },
  { key: 'inactive', label: '停用' },
]

export function MemberListClient({ members }: Props) {
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState<StatusTab>('active')

  const q = search.trim().toLowerCase()

  const filtered = useMemo(() =>
    members
      .filter(m => statusTab === 'all' || m.status === statusTab)
      .filter(m =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.display_name?.toLowerCase().includes(q) ?? false) ||
        GENDER_LABELS[m.gender].includes(q) ||
        ROLE_LABELS[m.role].toLowerCase().includes(q)
      ),
    [members, statusTab, q]
  )

  const counts: Record<StatusTab, number> = useMemo(() => ({
    all:      members.length,
    active:   members.filter(m => m.status === 'active').length,
    inactive: members.filter(m => m.status === 'inactive').length,
  }), [members])

  return (
    <div>
      {/* 狀態 Tabs */}
      <div className="flex border-b border-gray-100">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              statusTab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              statusTab === key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* 搜尋框 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 max-w-sm">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋姓名、暱稱、性別…"
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
            找到 {filtered.length} 位會員
          </p>
        )}
      </div>

      {/* 手機版：Card Layout */}
      <div className="md:hidden divide-y divide-gray-100">
        {filtered.length > 0 ? filtered.map(member => (
          <div key={member.id} className={`px-4 py-3 flex items-center gap-3 ${member.status === 'inactive' ? 'opacity-60' : ''}`}>
            {/* 左側：牌位圖示 */}
            <div className="flex-shrink-0">
              <TierBadge seasonSequence={member.attended} role={member.role} size="sm" />
            </div>

            {/* 中間：主要資訊 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">{member.name}</span>
                {member.display_name && (
                  <span className="text-xs text-gray-400">({member.display_name})</span>
                )}
                <Badge variant={roleVariant[member.role]}>{ROLE_LABELS[member.role]}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>出席 {member.attended} 次</span>
                {member.owed > 0
                  ? <span className="text-red-500 font-medium">欠款 {formatCurrency(member.owed)}</span>
                  : <span className="text-green-600">無欠款</span>
                }
              </div>
            </div>

            {/* 右側：詳情按鈕 */}
            <Link
              href={`/members/${member.id}`}
              className="flex-shrink-0 text-xs text-indigo-600 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              詳細
            </Link>
          </div>
        )) : (
          <p className="px-4 py-10 text-center text-sm text-gray-400">
            {q ? `找不到「${search}」的會員` : statusTab === 'inactive' ? '無停用會員' : '尚無會員'}
          </p>
        )}
      </div>

      {/* 桌機版：Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['姓名', '暱稱', '性別', '角色', '狀態', '牌位', '本季出席', '欠款', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length > 0 ? filtered.map(member => (
              <tr key={member.id} className={`hover:bg-gray-50 transition-colors ${member.status === 'inactive' ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{member.display_name || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{GENDER_LABELS[member.gender]}</td>
                <td className="px-4 py-3">
                  <Badge variant={roleVariant[member.role]}>{ROLE_LABELS[member.role]}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[member.status]}>{STATUS_LABELS[member.status]}</Badge>
                </td>
                <td className="px-4 py-3">
                  <TierBadge seasonSequence={member.attended} role={member.role} size="sm" />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{member.attended} 次</td>
                <td className="px-4 py-3 text-sm">
                  {member.owed > 0
                    ? <span className="text-red-600 font-medium">{formatCurrency(member.owed)}</span>
                    : <span className="text-gray-400">$0</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <Link href={`/members/${member.id}`} className="text-sm text-indigo-600 hover:underline">
                    詳情
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                  {q ? `找不到「${search}」的會員` : statusTab === 'inactive' ? '無停用會員' : '尚無會員'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
