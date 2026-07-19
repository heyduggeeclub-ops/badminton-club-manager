'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('帳號或密碼錯誤，請重試。')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 桌面版：左側插圖（直向版） */}
      <div className="hidden lg:block relative w-1/2 xl:w-[45%]">
        <Image
          src="/login-hero-portrait.png"
          alt="阿奇幼幼園羽球隊"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 0vw"
          className="object-cover"
        />
      </div>

      {/* 表單區 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* 手機版：頂部橫幅（橫向版） */}
          <div className="lg:hidden relative w-full aspect-[16/9] mb-6 rounded-2xl overflow-hidden shadow-sm">
            <Image
              src="/login-hero-landscape.png"
              alt="阿奇幼幼園羽球隊"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 0vw"
              className="object-cover"
            />
          </div>

          {/* Logo */}
          <div className="text-center mb-8">
            <span className="text-5xl">🏸</span>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">羽球隊管理系統</h1>
            <p className="mt-1 text-sm text-gray-500">管理員登入</p>
          </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="電子郵件"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="密碼"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              登入
            </Button>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}
