# AGENTS.md — 羽球隊管理系統（Badminton Club Manager）

> 本檔案為**工作規則與文件查詢路由**的單一事實來源，供 Claude Code、Codex 及其他 AI 工具共同讀取。
> 專案的實際資訊（進度、決策、已知問題、待辦、功能規則等）記錄在下方「文件索引與查詢路由」指向的對應文件，不重複寫在本檔。
> 與任何平台內建記憶或先前對話衝突時，**以本檔與其指向的文件為準**。
> 學到新的**工作規則或開發慣例**時，更新本檔對應段落；學到新的**專案事實**（進度、決策、問題、待辦、功能細節等）時，更新對應 KB 文件——兩者都不要只記在平台記憶。

## 啟動流程（AI Agent 接手步驟）

1. 先讀 `KB/00_PROJECT.md`（專案總覽與 KB 導航入口）
2. 依任務類型讀取對應 KB 文件（見下方「文件索引與查詢路由」）
3. 涉及功能／業務規則時，讀 `KB/FEATURES.md`
4. 涉及進度、已知問題或待辦事項時，讀 `KB/PROJECT_STATUS.md`
5. 涉及歷史取捨或架構決策原因時，讀 `KB/DECISIONS.md`
6. 涉及部署或環境設定時，讀 `KB/DEPLOYMENT.md`
7. 修改前務必以實際程式碼與設定檔驗證文件內容是否仍正確——文件可能落後於程式碼
8. 任務完成後，依本檔最上方「記憶更新規則」更新對應文件（工作規則→本檔；專案事實→對應 KB）

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

## 文件索引與查詢路由

> 快速導航／新 Agent 接手請先看 `KB/00_PROJECT.md`；本表為完整版查詢路由，兩者有出入時以本表為準。

| 資訊類別 | 位置 | 說明 |
|---|---|---|
| 專案總覽／導航入口 | `KB/00_PROJECT.md` | 新 Agent 接手第一站，只放摘要與路由 |
| 專案目標與範圍 | `../../01_PRD/羽球隊管理系統.pdf` | 產品需求（角色、功能、規則），repo 外上兩層 |
| 技術架構（前端／後端） | 本檔「技術棧」「目錄結構」 | — |
| 技術架構（資料庫） | `../../02_Database/schema_design.md`、`schema.sql` | ⚠️ 實際狀態以 `supabase/migrations/` 為準，設計文件可能落後 |
| 技術架構（UI／畫面流程） | `../../03_Wireframe/admin_wireframe.md` | — |
| 功能與業務規則 | `KB/FEATURES.md` | 現況對照摘要，完整規則見 01_PRD |
| 目前進度／已知問題／待辦事項 | `KB/PROJECT_STATUS.md` | — |
| 重要決策 | `KB/DECISIONS.md` | — |
| 測試與驗證方式 | 本檔「常用指令」 | 無自動化測試，以 build + 手動驗證為準 |
| 部署相關資訊 | `KB/DEPLOYMENT.md` | 正式環境細節部分待確認 |
| 記憶更新規則 | 本檔最上方說明 | — |

⚠️ 上表 `../../` 開頭的路徑是相對於本檔（repo 內）往上兩層。若本 repo 未來被單獨搬移或分享（不含上層的 01_PRD／02_Database／03_Wireframe），這些路徑會失效，屆時需一併調整或改用絕對／其他相對路徑。

## 版本紀錄

- 2026-07-09：建立 AGENTS.md 與 CLAUDE.md，作為 Claude Code / Codex 共用規則（遷移健檢後補建）
- 2026-07-11：新增 `KB/`（FEATURES、PROJECT_STATUS、DECISIONS、DEPLOYMENT），將「相關文件」擴充為完整的文件索引與查詢路由表；同步修正 `README.md` 誤植的 Next.js 版本號
- 2026-07-11（續）：新增 `KB/00_PROJECT.md` 作為導航入口，並補上「啟動流程」段落；修正 `README.md` 過時的 migration 步驟與 Phase 完成度描述
