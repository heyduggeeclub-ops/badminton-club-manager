-- ============================================================
-- 014_clean_all_keep_settings.sql
-- 全部清除，僅保留系統設定（seasons / fee_rules）
--
-- 使用時機：想要完全乾淨的環境重新開始
--           清除後請重新建立自己的會員資料並綁定帳號
--
-- 保留：
--   seasons              ← 季度設定
--   fee_rules            ← 收費規則
--   fee_rule_tiers       ← 收費級距
--
-- 清除：
--   members              ← 清除後需重新建立
--   activities
--   registrations
--   attendance_records
--   payment_transactions
--   payment_allocations
--   expenses
--   audit_logs
--
-- ⚠️  執行後步驟：
--   1. 到「會員管理」→「新增會員」建立自己的會員資料
--   2. 到「設定」→「帳號綁定」把 Supabase Auth UID 填入
--   （或直接在 Supabase Dashboard 的 members 表更新 user_id）
-- ============================================================

BEGIN;

-- 1. 清除 fee_rules.created_by（RESTRICT 外鍵，不清會阻擋刪除 members）
UPDATE public.fee_rules SET created_by = NULL;

-- 2. 操作紀錄
DELETE FROM public.audit_logs;

-- 3. 付款分配
DELETE FROM public.payment_allocations;

-- 4. 收費紀錄
DELETE FROM public.payment_transactions;

-- 5. 出席紀錄
DELETE FROM public.attendance_records;

-- 6. 報名記錄
DELETE FROM public.registrations;

-- 7. 支出記錄
DELETE FROM public.expenses;

-- 8. 活動（需在上方所有相依資料清除後才能刪）
DELETE FROM public.activities;

-- 9. 會員（最後刪，上方所有 RESTRICT 參考已清除）
DELETE FROM public.members;

COMMIT;

-- 驗收查詢
SELECT 'members (應為 0)'              AS t, COUNT(*) FROM public.members
UNION ALL
SELECT 'seasons (保留)',                COUNT(*) FROM public.seasons
UNION ALL
SELECT 'fee_rules (保留)',              COUNT(*) FROM public.fee_rules
UNION ALL
SELECT 'activities (應為 0)',           COUNT(*) FROM public.activities
UNION ALL
SELECT 'registrations (應為 0)',        COUNT(*) FROM public.registrations
UNION ALL
SELECT 'attendance_records (應為 0)',   COUNT(*) FROM public.attendance_records
UNION ALL
SELECT 'payment_transactions (應為 0)', COUNT(*) FROM public.payment_transactions
UNION ALL
SELECT 'expenses (應為 0)',             COUNT(*) FROM public.expenses;
