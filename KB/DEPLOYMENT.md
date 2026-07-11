# DEPLOYMENT.md — 部署相關資訊

## 本機開發環境（已確認，摘自 README.md）

1. `npm install`
2. 複製 `.env.local.example` 為 `.env.local`，填入 Supabase 專案的 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`（值從 Supabase Dashboard → Settings → API 取得）
3. 於 Supabase Dashboard → SQL Editor 手動執行 `supabase/migrations/` 內的 SQL（依編號順序）
4. 建立管理員帳號的詳細步驟見 `README.md`

## 正式環境（待確認）

- 目前專案文件中沒有找到正式部署平台、網域、CI/CD 設定的明確記錄
- 待確認：是否部署於 Vercel（先前討論中曾提及，但專案內未找到對應設定檔可確認，例如 `vercel.json` 或平台專屬設定檔）
- 待確認：正式環境的環境變數管理方式（是否使用與本機不同的 Supabase 專案）
- 待確認：正式環境資料庫 migration 執行流程是否與本機相同（手動貼到 SQL Editor），或有自動化機制

## 安全提醒

- `.env.local` 內含真實金鑰，已列入 `.gitignore`。複製整個專案資料夾時（例如搬到 AI_Workspace）金鑰檔案會一併複製，請留意存放權限，避免外流或誤傳。
