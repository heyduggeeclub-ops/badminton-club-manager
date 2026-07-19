# PROJECT_STATUS.md — 目前進度／已知問題／待辦事項

> 本檔追蹤專案「現在狀態」。詳細開發歷史以 git commit 記錄為準，本檔只整理現況重點，不重複列出逐筆 commit。
> 最後整理日期：2026-07-19

## 目前進度

- 資料庫 migrations 已至 `015`（另有 `010a`），管理端模組（活動、報名、出席、會員、收費規則、財務、操作紀錄、匯出）皆已有對應路由與 Server Actions 實作
- 2026-07-11：新增「臨打費用（非會員）」功能，詳見 `FEATURES.md`／`DECISIONS.md`；migration `014_guest_fee.sql` 已在 Supabase 執行，`npm run build` 已通過，已手動測試（新增臨打會員 → 報名 → 打卡 → 確認收費 250/230 正確），程式碼已 commit/push
- 2026-07-11（續）：新增 `supabase/scripts/clean_reset_keep_members_and_config.sql`，用於清空活動/報名/出席/收款/支出/操作紀錄，但保留 members／seasons／fee_rules（含臨打固定費用設定）；同時移除舊的 `014_clean_keep_members.sql`（檔名與內容不符——內容其實是「連會員也清掉，僅留 seasons/fee_rules」，容易與新腳本混淆，故刪除）。此清理腳本已於 Supabase 執行過
- 2026-07-11（續2）：新增「本季系統外已出席次數校正」功能（`member_season_adjustments` 表、migration `015_season_attendance_adjustment.sql`），解決季度中途才開始使用系統時，牌位／收費從第 1 次重新算、跟現實已用牌位收費對不起來的問題。詳見 `FEATURES.md`／`DECISIONS.md`。migration 已在 Supabase 執行、`npm run build` 已通過、已手動測試（會員詳情頁填校正值後，會員列表／報名頁／詳情頁三處牌位與次數顯示一致），程式碼已 commit/push
- 2026-07-14：建立 Hermes（Telegram agent，另一台 Windows 電腦）唯讀查詢整合——Supabase 已建立 `hermes_readonly` DB 角色（只能 SELECT、各表有 `hermes_read` RLS policy、statement_timeout 10s），Hermes 端以 psql + `BADMINTON_DB_URL` 環境變數連 Session pooler，已實測 Telegram 查詢成功，Hermes 端建有 `badminton-db-query` skill。設定腳本與 SOP 見 repo 外 `../../../05_Hermes/`。⚠️ 維護注意：新 migration 建新表後，需重跑 `create_hermes_readonly_role.sql` 的 DO 區塊，Hermes 才查得到新表
- 2026-07-19：操作紀錄頁（audit-logs）變更摘要人性化——原本直接顯示 `new_data` 的 JSON 原文，改為中文摘要：更新類操作只列實際變動欄位（「欄位：舊 → 新」），新增類操作列出有值欄位；欄位名與 enum 值（角色／狀態／付款方式等）皆翻成中文。另補上 `set_member_season_adjustment`（出席次數校正）的操作標籤與 `member_season_adjustment` 的類型標籤。`tsc --noEmit` 通過；**尚未 commit/push、未跑 `npm run build`**（沙箱環境跑不動，需在開發機驗證後部署）
- 2026-07-19（續）：管理員帳號誤改事件處理完畢——資料以 SQL 復原（DUGGEE／leader／active），事件教訓記入本檔「已知問題」與「待辦事項」，《操作手冊.docx》Q&A 新增「會員列表空白、會員好像都不見了？」條目（教使用者先確認右上角登入身分）
- 2026-07-20：登入頁加入球隊插圖（阿奇幼幼園主題圖）——桌面版（lg 以上）左右分欄，左半放直向版插圖（`public/login-hero-portrait.png`）；手機版表單上方放橫向版橫幅（`public/login-hero-landscape.png`），使用 `next/image` fill + object-cover。`tsc --noEmit` 通過。圖檔已就位：原圖與裁切版存於 `../../../06_Assets/原始圖檔/`（新建資料夾，橫向版.png／直向版.png），`public/login-hero-portrait.png`（501×763）與 `public/login-hero-landscape.png`（918×446）已放入。**尚未 commit/push**（待使用者在開發機跑 `npm run build` 後推送）
- 近期開發重點：行動裝置版 UX（BottomNav、卡片式列表）、多筆查詢效能優化（`Promise.all` 減少 RTT）
- 活動詳情已顯示本次到場人員的應收、實收與付款狀態
- `AGENTS.md`／`CLAUDE.md` 已於 2026-07-09 建立，作為 Claude Code／Codex 共用規則檔
- 完整逐筆進度請看程式碼 git log，不在此重複列出

## 已知問題

- 原始 repo（複製前）`git status` 顯示 `AGENTS.md`／`CLAUDE.md` 呈現「已刪除但又是未追蹤新檔」的異常狀態，且 `supabase/scripts/` 內 3 個檔案有未提交的修改。**待確認**：是否為預期中的工作中變更，或需要清理／提交
- `README.md` 先前誤植 Next.js 版本為 15（已於本次文件整理修正為 16，與 `package.json` 一致）
- `02_Database/schema_design.md`、`03_Wireframe/admin_wireframe.md` 標註版本 1.0（2026-06-17），`AGENTS.md` 已註明「schema 實際狀態以 migrations 為準，設計文件可能落後」。**待確認**：這兩份設計文件是否需要更新到目前狀態，或維持僅供參考
- `03_UI/` 資料夾為空，用途待確認
- 管理員的會員資料可被其他管理員任意改名／降權／停用，無任何保護。2026-07-19 實例：綁定系統管理員登入帳號（heyduggeeclub@gmail.com）的會員「DUGGEE」被另一位管理員當成測試資料改名為「測試員2號」並降為一般會員＋停用，導致該帳號登入後因 RLS（`member_read_self`）只能看到自己，看似「會員全部不見」。資料實際上完好，靠 `audit_logs` 釐清後以 SQL 復原（改回 DUGGEE／leader／active）。事件細節不重複記錄，查 `audit_logs` 即可

## 待辦事項

- 待開發（暫緩）：「球友自助查詢頁」— 球友透過個人專屬 token 連結（免登入）查詢本季出席次數、牌位、下次預計收費、欠款、近期出席與即將活動。規格草稿見 `../../../01_PRD/球友自助查詢頁_規格草稿.md`（2026-07-13 建立，尚未實作）。2026-07-14 決定：目前 Hermes 唯讀查詢已滿足日常需求，此功能等團主提出需求再啟動，屆時再確認身分識別方案（token 連結 vs LINE Login）
- 待確認：`settings` 頁面功能範圍是否已完整（見 `FEATURES.md`）
- 待確認：是否需要將 `01_PRD`／`02_Database`／`03_Wireframe` 內容與目前程式重新逐項核對
- 待確認：正式部署環境資訊需補齊（見 `DEPLOYMENT.md`）
- 待評估：管理員保護防呆——禁止修改／停用具管理角色（leader／vice_leader）的會員，或至少在會員列表／詳情頁標示「此會員已綁定登入帳號」，避免再發生 2026-07-19 管理員帳號被誤改事件（見「已知問題」）

## 更新方式

有新完成事項時新增到「目前進度」；發現新問題時新增到「已知問題」；有新的未完成工作時新增到「待辦事項」。不確定的項目請標示「待確認」，不要自行假設已完成或已解決。
