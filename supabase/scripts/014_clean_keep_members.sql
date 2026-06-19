-- ============================================================
-- 014_clean_keep_members.sql
-- 清除所有活動資料，保留：members / seasons / fee_rules
--
-- 使用時機：想要乾淨的測試環境，但保留現有 3 位會員
--
-- 保留：
--   members              ← 會員帳號與身分
--   seasons              ← 季度設定
--   fee_rules            ← 收費規則
--   fee_rule_tiers       ← 收費級距
--
-- 清除：
--   activities
--   registrations
--   attendance_records
--   payment_transactions
--   payment_allocations
--   expenses
--   audit_logs
-- ============================================================

BEGIN;

-- 1. 操作紀錄
DELETE FROM public.audit_logs;

-- 2. 付款分配
DELETE FROM public.payment_allocations;

-- 3. 收費紀錄
DELETE FROM public.payment_transactions;

-- 4. 出席紀錄
DELETE FROM public.attendance_records;

-- 5. 報名記錄
DELETE FROM public.registrations;

-- 6. 支出記錄
DELETE FROM public.expenses;

-- 7. 活動（需在上方所有相依資料清除後才能刪）
DELETE FROM public.activities;

COMMIT;

-- 驗收查詢
SELECT 'members (保留)'         AS t, COUNT(*) FROM public.members
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
