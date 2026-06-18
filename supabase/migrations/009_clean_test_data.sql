-- ============================================================
-- 009_clean_test_data.sql
-- 清除所有測試資料，保留系統設定
--
-- 保留（不動）：
--   seasons          ← 季度設定
--   fee_rules        ← 收費規則
--   fee_rule_tiers   ← 收費級距
--
-- 清除：
--   members, activities, registrations,
--   attendance_records, payment_transactions,
--   payment_allocations, expenses, audit_logs
--
-- ⚠️  執行後 Supabase Auth 帳號仍存在，
--     請至 會員管理 → 新增自己的會員資料，
--     再到 設定 → 綁定 User ID。
-- ============================================================

BEGIN;

-- 1. 清除 fee_rules.created_by（RESTRICT 外鍵，不清會阻擋刪除 members）
UPDATE public.fee_rules SET created_by = NULL;

-- 2. 操作紀錄（actor_id 是 SET NULL，不擋，但先刪乾淨）
DELETE FROM public.audit_logs;

-- 3. 付款分配（child of payment_transactions & attendance_records）
DELETE FROM public.payment_allocations;

-- 4. 收費紀錄（RESTRICT → members，需在 members 前刪）
DELETE FROM public.payment_transactions;

-- 5. 出席紀錄（RESTRICT → activities & members，需在兩者前刪）
DELETE FROM public.attendance_records;

-- 6. 報名記錄（CASCADE ← activities，RESTRICT → members）
DELETE FROM public.registrations;

-- 7. 支出記錄（RESTRICT → seasons 保留，SET NULL ← activities）
DELETE FROM public.expenses;

-- 8. 活動（RESTRICT → seasons & fee_rules 保留；created_by → members RESTRICT）
DELETE FROM public.activities;

-- 9. 會員（最後刪，上方所有 RESTRICT 參考已清除）
DELETE FROM public.members;

COMMIT;

-- 完成後可用以下語法確認各表是否清空：
-- SELECT 'members' as t, count(*) FROM members
-- UNION ALL SELECT 'activities', count(*) FROM activities
-- UNION ALL SELECT 'registrations', count(*) FROM registrations
-- UNION ALL SELECT 'attendance_records', count(*) FROM attendance_records
-- UNION ALL SELECT 'payment_transactions', count(*) FROM payment_transactions
-- UNION ALL SELECT 'expenses', count(*) FROM expenses
-- UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
-- UNION ALL SELECT 'seasons (保留)', count(*) FROM seasons
-- UNION ALL SELECT 'fee_rules (保留)', count(*) FROM fee_rules;
