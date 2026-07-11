# PROJECT_STATUS.md — 目前進度／已知問題／待辦事項

> 本檔追蹤專案「現在狀態」。詳細開發歷史以 git commit 記錄為準，本檔只整理現況重點，不重複列出逐筆 commit。
> 最後整理日期：2026-07-11

## 目前進度

- 資料庫 migrations 已至 `015`（另有 `010a`），管理端模組（活動、報名、出席、會員、收費規則、財務、操作紀錄、匯出）皆已有對應路由與 Server Actions 實作
- 2026-07-11：新增「臨打費用（非會員）」功能，詳見 `FEATURES.md`／`DECISIONS.md`；migration `014_guest_fee.sql` 已在 Supabase 執行，`npm run build` 已通過，程式碼已 commit/push
- 2026-07-11（續）：新增 `supabase/scripts/clean_reset_keep_members_and_config.sql`，用於清空活動/報名/出席/收款/支出/操作紀錄，但保留 members／seasons／fee_rules（含臨打固定費用設定）；同時移除舊的 `014_clean_keep_members.sql`（檔名與內容不符——內容其實是「連會員也清掉，僅留 seasons/fee_rules」，容易與新腳本混淆，故刪除）。此清理腳本已於 Supabase 執行過
- 2026-07-11（續2）：新增「本季系統外已出席次數校正」功能（`member_season_adjustments` 表、migration `015_season_attendance_adjustment.sql`），解決季度中途才開始使用系統時，牌位／收費從第 1 次重新算、跟現實已用牌位收費對不起來的問題。詳見 `FEATURES.md`／`DECISIONS.md`。**尚未在 Supabase 執行、尚未跑 `npm run build`、尚未手動驗證**（本次沙箱同樣無法建置，見上方已知限制）
- 近期開發重點：行動裝置版 UX（BottomNav、卡片式列表）、多筆查詢效能優化（`Promise.all` 減少 RTT）
- 活動詳情已顯示本次到場人員的應收、實收與付款狀態
- `AGENTS.md`／`CLAUDE.md` 已於 2026-07-09 建立，作為 Claude Code／Codex 共用規則檔
- 完整逐筆進度請看程式碼 git log，不在此重複列出

## 已知問題

- 原始 repo（複製前）`git status` 顯示 `AGENTS.md`／`CLAUDE.md` 呈現「已刪除但又是未追蹤新檔」的異常狀態，且 `supabase/scripts/` 內 3 個檔案有未提交的修改。**待確認**：是否為預期中的工作中變更，或需要清理／提交
- `README.md` 先前誤植 Next.js 版本為 15（已於本次文件整理修正為 16，與 `package.json` 一致）
- `02_Database/schema_design.md`、`03_Wireframe/admin_wireframe.md` 標註版本 1.0（2026-06-17），`AGENTS.md` 已註明「schema 實際狀態以 migrations 為準，設計文件可能落後」。**待確認**：這兩份設計文件是否需要更新到目前狀態，或維持僅供參考
- `03_UI/` 資料夾為空，用途待確認

## 待辦事項

- 待確認：`settings` 頁面功能範圍是否已完整（見 `FEATURES.md`）
- 待確認：是否需要將 `01_PRD`／`02_Database`／`03_Wireframe` 內容與目前程式重新逐項核對
- 待確認：正式部署環境資訊需補齊（見 `DEPLOYMENT.md`）
- 待確認：臨打功能尚未實際手動操作驗證（新增一位角色為「臨打」的會員 → 報名／打卡 → 確認費用套用 `fee_rules.guest_fee_male`／`guest_fee_female`，且不受該會員之前出席次數影響）——`014_guest_fee.sql` 已執行、`npm run build` 已通過，但實際打卡流程尚未人工測過
- **待辦**：`015_season_attendance_adjustment.sql` 尚未在 Supabase 執行。執行後需：(1) 跑 `npm run build`；(2) 到某會員詳情頁填「本季系統外已出席次數」，確認會員列表、報名頁、會員詳情頁三處的牌位與次數顯示一致，且打卡後 `attendance_records.season_sequence`／`fee_amount` 有正確套用校正值

## 更新方式

有新完成事項時新增到「目前進度」；發現新問題時新增到「已知問題」；有新的未完成工作時新增到「待辦事項」。不確定的項目請標示「待確認」，不要自行假設已完成或已解決。
