'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  CheckSquare,
  DollarSign,
  Users,
  Settings,
  ScrollText,
  FileDown,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',     label: '總覽',     icon: LayoutDashboard },
  { href: '/activities',    label: '活動管理',  icon: CalendarDays },
  { href: '/registrations', label: '報名管理',  icon: ClipboardList },
  { href: '/attendance',    label: '出席收費',  icon: CheckSquare },
  { href: '/finance',       label: '財務管理',  icon: DollarSign },
  { href: '/members',       label: '會員管理',  icon: Users },
  { href: '/fee-rules',     label: '收費規則',  icon: Settings },
]

const bottomItems = [
  { href: '/export',     label: '資料匯出',  icon: FileDown },
  { href: '/audit-logs', label: '操作紀錄',  icon: ScrollText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 h-screen bg-gray-900 hidden md:flex flex-col fixed top-0 left-0 z-30">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏸</span>
          <span className="text-white font-semibold text-sm leading-tight">
            羽球隊<br />管理系統
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-700 space-y-1">
        {bottomItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
