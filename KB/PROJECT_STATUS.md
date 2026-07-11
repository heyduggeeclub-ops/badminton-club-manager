# PROJECT_STATUS.md — 目前進度／已知問題／待辦事項

> 本檔追蹤專案「現在狀態」。詳細開發歷史以 git commit 記錄為準，本檔只整理現況重點，不重複列出逐筆 commit。
> 最後整理日期：2026-07-11

## 目前進度

- 資料庫 migrations 已至 `013`（另有 `010a`），管理端模組（活動、報名、出席、會員、收費規則、財務、操作紀錄、匯出）皆已有對應路由與 Server Actions 實作
- 近期開發重點：行動裝置版 UX（BottomNav、卡片式列表）、多筆查詢效能優化（`Promise.all` 減少 RTT）
- `AGENTS.md`／`CLAUDE.md` 已於 2026-07-09 建立，作為 Claude Code／Codex 共用規則檔
- 完整逐筆進度請看程式碼 git log，不在此重複列出

## 已知問題

- 原始 repo（複製前）`git status` 顯示 `AGENTS.md`／`CLAUDE.md` 呈現「已刪除但又是未追蹤新檔」的異常狀態，且 `supabase/scripts/` 內 3 個檔案有未提交的修改。**待確認**：是否為預期中的工作中變更，或需要清理／提交
- `README.md` 先前誤植 Next.js 版本為 15（已於本次文件整理修正為 16，與 `package.json` 一致）
- `02_Database/schema_design.md`、`03_Wireframe/admin_wireframe.md` 標註版本 1.0（2026-06-17），`AGENTS.md` 已註明「schema 實際狀態以 migrations 為準，設計文件可能落後」。**待確認**：這兩份設計文件是否需要更新到目前狀態，或維持僅供參考
- `03_UI/` 資料夾為空，用途待確認
- `supabase/scripts/014_clean_keep_members.sql` 檔名沿用 migration 編號慣例但實際放在 `scripts/`（非 `migrations/`），容易混淆。**待確認**：是否要重新命名或補充說明

## 待辦事項

- 待確認：`settings` 頁面功能範圍是否已完整（見 `FEATURES.md`）
- 待確認：是否需要將 `01_PRD`／`02_Database`／`03_Wireframe` 內容與目前程式重新逐項核對
- 待確認：正式部署環境資訊需補齊（見 `DEPLOYMENT.md`）

## 更新方式

有新完成事項時新增到「目前進度」；發現新問題時新增到「已知問題」；有新的未完成工作時新增到「待辦事項」。不確定的項目請標示「待確認」，不要自行假設已完成或已解決。
