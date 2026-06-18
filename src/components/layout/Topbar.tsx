import { createClient } from '@/lib/supabase/server'
import { getSeasonLabel, getCurrentSeason } from '@/lib/utils'
import { LogOut, User } from 'lucide-react'

export async function Topbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { year, quarter } = getCurrentSeason()

  let memberName = user?.email ?? '管理員'
  if (user) {
    const { data: member } = await supabase
      .from('members')
      .select('name')
      .eq('user_id', user.id)
      .single()
    if (member) memberName = member.name
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 fixed top-0 left-0 md:left-56 right-0 z-20">
      {/* Mobile: logo + season */}
      <div className="flex items-center gap-2">
        <span className="text-xl md:hidden">🏸</span>
        <div>
          <span className="hidden md:inline text-sm text-gray-500 mr-1">當前季度</span>
          <span className="text-sm font-semibold text-indigo-600">
            {getSeasonLabel(year, quarter)}
            <span className="hidden md:inline">（{['', '1–3月', '4–6月', '7–9月', '10–12月'][quarter]}）</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-700">
          <User size={16} className="text-gray-400" />
          <span>{memberName}</span>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">登出</span>
          </button>
        </form>
      </div>
    </header>
  )
}
