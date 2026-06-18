import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // allowedOrigins 不需要設定：
  // - 開發環境：Next.js 自動允許 localhost
  // - 生產環境（Vercel）：Next.js 自動允許同域請求
  // 只有在使用自訂網域或反向代理時才需要手動指定
}

export default nextConfig
