import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '羽球隊管理系統',
  description: 'Badminton Club Manager',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
