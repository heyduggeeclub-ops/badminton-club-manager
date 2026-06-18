'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, CalendarDays, ClipboardList, CheckSquare, MoreHorizontal } from 'lucide-react'

const navItems = [
  { href: '/dashboard',     label: '首頁', icon: LayoutDashboard },
  { href: '/activities',    label: '活動', icon: CalendarDays },
  { href: '/attendance',    label: '出席', icon: CheckSquare, center: true },
  { href: '/registrations', label: '報名', icon: ClipboardList },
  { href: '/more',          label: '更多', icon: MoreHorizontal },
]

// 「更多」tab 包含這些路徑
const MORE_PATHS = ['/more', '/finance', '/fee-rules', '/audit-logs', '/settings', '/export', '/members']

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex md:hidden safe-area-inset-bottom">
      {navItems.map(({ href, label, icon: Icon, center }) => {
        const active = href === '/more'
          ? MORE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
          : pathname === href || pathname.startsWith(href + '/')

        if (center) {
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-end pb-2"
            >
              <div
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all',
                  active ? 'bg-indigo-700' : 'bg-indigo-600'
                )}
                style={{ marginTop: '-14px', boxShadow: '0 4px 16px rgba(99,102,241,0.45)' }}
              >
                <Icon size={22} color="white" strokeWidth={2.2} />
                <span className="text-[10px] font-bold text-white leading-none">{label}</span>
              </div>
            </Link>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center pt-2 pb-3 gap-0.5"
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              className={active ? 'text-indigo-600' : 'text-gray-400'}
            />
            <span className={cn(
              'text-[10px] font-medium leading-none',
              active ? 'text-indigo-600' : 'text-gray-400'
            )}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
