import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop: fixed left sidebar */}
      <Sidebar />
      {/* Top bar: full-width on mobile, offset on desktop */}
      <Topbar />
      {/* Main content */}
      <main className="md:ml-56 pt-14 min-h-screen pb-24 md:pb-0">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  )
}
