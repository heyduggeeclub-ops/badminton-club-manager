# AGENTS.md — 羽球隊管理系統（Badminton Club Manager）

> 本檔案為本 repo 的**單一事實來源**，供 Claude Code、Codex 及其他 AI 工具共同讀取。
> 與任何平台內建記憶或先前對話衝突時，**以本檔為準**。
> 學到新的專案慣例或架構決策時，**更新本檔對應段落**，不要只記在平台記憶。

## 專案概述

羽球隊管理系統：活動報名、出席、收費規則、財務、成員管理。管理端為主（`(admin)` route group），行動裝置優先 UI。

## 技術棧

- Next.js 16（App Router）+ React 19 + TypeScript
- Tailwind CSS 3、lucide-react
- Supabase（PostgreSQL + Auth + RLS），`@supabase/ssr`
- date-fns

## 常用指令

```bash
npm run dev     # 開發（port 3000）
npm run build   # 建置
npm run lint    # ESLint
```

無自動化測試——改動後以 `npm run build` + 手動驗證為準。

## 目錄結構

| 路徑 | 內容 |
|---|---|
| `src/app/(admin)/` | 管理端頁面（activities、attendance、members、finance、fee-rules、registrations、settings、audit-logs、export…） |
| `src/app/api/` | Route handlers（auth signout、export） |
| `src/lib/actions/` | **Server Actions**——所有資料異動走這裡，依領域分檔 |
| `src/lib/supabase/` | Supabase client（`client.ts` 瀏覽器 / `server.ts` 伺服器） |
| `src/components/` | ui（Button/Card/Input/Badge）、layout（Sidebar/Topbar/BottomNav）、領域元件 |
| `src/types/index.ts` | 共用型別 |
| `supabase/migrations/` | SQL migrations，**編號遞增**（001~013），手動貼到 Supabase SQL Editor 執行 |
| `supabase/scripts/` | 維運腳本（備份、清資料、demo reset） |

## 開發慣例

- 資料異動一律走 `src/lib/actions/` 的 Server Action，不在 client 端直連 Supabase 寫入
- Server Component 預設，互動邏輯抽成 `*Client.tsx`
- 多筆查詢用 `Promise.all` 減少 RTT（既有效能優化模式，維持之）
- schema 變更：新增編號遞增的 migration 檔，**不修改舊 migration**；RLS policy 一併考慮
- UI 文案為**繁體中文**（台灣用語）；程式碼註解中英皆可
- Commit 風格：`類型: 簡述`（如 `fix:`、`feat:`），沿用現有歷史風格
- 手機版優先：改 UI 時先驗證窄螢幕（BottomNav 為主要導航）

## 環境變數（見 `.env.local.example`）

`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`（僅 server side）。
**`.env.local` 含真實金鑰，已 gitignore，嚴禁提交或外流。**

## 相關文件（repo 外，上兩層資料夾）

- `../../01_PRD/羽球隊管理系統.pdf` — 產品需求
- `../../02_Database/schema_design.md`、`schema.sql` — 資料庫設計文件
- `../../03_Wireframe/admin_wireframe.md` — 管理端 wireframe

⚠️ schema 實際狀態以 `supabase/migrations/` 為準，設計文件可能落後。

## 版本紀錄

- 2026-07-09：建立 AGENTS.md 與 CLAUDE.md，作為 Claude Code / Codex 共用規則（遷移健檢後補建）
