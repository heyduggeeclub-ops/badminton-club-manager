# 00_PROJECT.md — 專案總覽與 KB 導航入口

> 本檔是任何 AI Agent（Claude、Codex 或其他工具）接手本專案時的**第一個入口**。
> 只放摘要與路由，不放完整內容——完整內容一律在下方指向的對應文件，避免重複保存。

## 專案名稱

羽球隊管理系統（Badminton Club Manager）

## 專案目的

供羽球隊團長與副團長使用的管理系統，降低人工整理報名、出席、收費與財務管理的工作量（不需人工計算出席次數／判斷收費等級／紙本記帳／Excel 統計財務），並保留既有的 LINE 接龍報名習慣。完整需求見 `../../../01_PRD/羽球隊管理系統.pdf`。

## 主要使用者

- 一般球友：查看活動、個人出席、個人欠款、本季出席次數、下次預計收費
- 團長／副團長：建立活動、管理會員、匯入報名、管理候補、報到、收費、管理支出、查看財務報表

## 目前系統定位

開發中專案，管理端（`(admin)`）主要模組頁面已建立，行動裝置優先 UI。**是否已正式上線、部署於何處待確認**——見 `KB/DEPLOYMENT.md`。

## 技術棧摘要

Next.js 16（App Router）+ React 19 + TypeScript、Tailwind CSS 3、Supabase（PostgreSQL + Auth + RLS）。完整技術棧與常用指令見 `AGENTS.md`。

## 核心業務規則摘要

- 可報名人數 = 場地數量 × 每場最大人數；額滿自動候補，遞補時原取消者不收費
- 只有實際到場者才計入季度出席次數與收費；季度為 Q1–Q4，每季重新統計
- 收費規則版本化（依 `effective_from` 生效日），歷史收費不受新規則影響
- 未付款建立欠款紀錄，下次出席時顯示「本次費用 + 歷史欠款」

完整規則、模組對照與待確認事項見 `KB/FEATURES.md`。

## 目前完成狀態摘要

管理端主要模組（活動、報名、出席、會員、收費規則、財務、操作紀錄、匯出、設定、總覽）頁面均已建立；資料庫 migrations 進度到 `013`（另有 `010a`）；近期開發聚焦行動版 UX 與查詢效能。

完整進度、已知問題、待辦事項見 `KB/PROJECT_STATUS.md`。

## 已知主要風險摘要

正式部署狀態未確認；原始 repo 曾有未提交的工作中變更；部分設計文件（DB schema、wireframe）版本可能落後於程式碼；`settings` 頁面實際功能範圍未明。

完整清單見 `KB/PROJECT_STATUS.md`（已知問題）與 `KB/DEPLOYMENT.md`（部署待確認事項）。

## KB 文件地圖

| 文件 | 用途 |
|---|---|
| `KB/00_PROJECT.md` | 本檔，專案總覽與導航入口 |
| `KB/FEATURES.md` | 功能與業務規則（現況對照摘要，完整規則見 01_PRD） |
| `KB/PROJECT_STATUS.md` | 目前進度、已知問題、待辦事項 |
| `KB/DECISIONS.md` | 重要決策與取捨原因 |
| `KB/DEPLOYMENT.md` | 部署相關資訊（本機已確認，正式環境多數待確認） |

repo 外（上兩層資料夾）另有 `01_PRD`（產品需求）、`02_Database`（資料庫設計文件）、`03_Wireframe`（管理端 wireframe）——完整路由見 `AGENTS.md`「文件索引與查詢路由」。

## 不同任務應閱讀哪些文件

| 任務類型 | 建議閱讀 |
|---|---|
| 了解或調整功能／業務規則 | `KB/FEATURES.md`（需要完整規格再看 `01_PRD`） |
| 了解目前做到哪、有什麼問題、下一步做什麼 | `KB/PROJECT_STATUS.md` |
| 了解某個做法為什麼這樣設計 | `KB/DECISIONS.md` |
| 部署、環境變數、正式環境設定 | `KB/DEPLOYMENT.md` + `README.md` |
| 程式改動慣例、常用指令、目錄結構 | `AGENTS.md` |
| 資料庫欄位／關聯設計 | `02_Database/schema_design.md`（⚠️ 以 `supabase/migrations/` 實際狀態為準） |
| 畫面／操作流程 | `03_Wireframe/admin_wireframe.md` |

## 重要資訊的單一事實來源位置

| 資訊類別 | 位置 |
|---|---|
| 專案目標與範圍 | `01_PRD/羽球隊管理系統.pdf` |
| 技術架構 | `AGENTS.md`（技術棧／目錄結構）＋ `02_Database/`（資料庫）＋ `03_Wireframe/`（UI） |
| 功能與業務規則 | `KB/FEATURES.md` |
| 目前進度／已知問題／待辦 | `KB/PROJECT_STATUS.md` |
| 重要決策 | `KB/DECISIONS.md` |
| 測試與驗證方式 | `AGENTS.md`「常用指令」 |
| 部署相關資訊 | `KB/DEPLOYMENT.md` |
| 記憶更新規則 | `AGENTS.md` 最上方說明 |

⚠️ 本表為方便快速查找的摘要；若與 `AGENTS.md`「文件索引與查詢路由」內容有出入，以 `AGENTS.md` 為準。
