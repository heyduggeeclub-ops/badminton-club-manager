import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  DollarSign,
  Settings,
  ScrollText,
  FileDown,
  Users,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'

const sections = [
  {
    title: '功能',
    items: [
      {
        href: '/finance',
        icon: DollarSign,
        label: '財務管理',
        description: '支出記錄、損益總覽',
        color: 'text-green-600 bg-green-50',
      },
      {
        href: '/members',
        icon: Users,
        label: '會員管理',
        description: '會員資料、牌位查詢',
        color: 'text-indigo-600 bg-indigo-50',
      },
    ],
  },
  {
    title: '設定',
    items: [
      {
        href: '/fee-rules',
        icon: SlidersHorizontal,
        label: '收費規則',
        description: '費率設定、版本管理',
        color: 'text-amber-600 bg-amber-50',
      },
      {
        href: '/audit-logs',
        icon: ScrollText,
        label: '操作紀錄',
        description: '所有管理員操作歷程',
        color: 'text-purple-600 bg-purple-50',
      },
    ],
  },
  {
    title: '工具',
    items: [
      {
        href: '/export',
        icon: FileDown,
        label: '資料匯出',
        description: '下載 CSV 報表',
        color: 'text-blue-600 bg-blue-50',
      },
      {
        href: '/settings',
        icon: Settings,
        label: '系統設定',
        description: '季度與基本設定',
        color: 'text-gray-600 bg-gray-100',
      },
    ],
  },
]

export default function MorePage() {
  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title="更多" description="功能、設定與工具" />

      {sections.map(section => (
        <div key={section.title}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">
            {section.title}
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-50 shadow-sm">
            {section.items.map(({ href, icon: Icon, label, description, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* 版本資訊 */}
      <p className="text-center text-xs text-gray-300 pb-2">羽球隊管理系統 v1.0</p>
    </div>
  )
}
