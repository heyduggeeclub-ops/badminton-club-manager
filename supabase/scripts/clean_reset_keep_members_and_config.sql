-- ============================================================
-- clean_reset_keep_members_and_config.sql
-- 清空所有「活動類」資料，保留會員名單與系統設定，
-- 讓系統回到「有會員、有收費規則，但沒有任何活動歷史」的乾淨狀態。
--
-- 保留：
--   members              ← 會員名單（含角色、性別等資料完整保留）
--   seasons               ← 季度設定
--   fee_rules             ← 收費規則（含團長/副團長/臨打固定費用）
--   fee_rule_tiers        ← 收費級距
--
-- 清除：
--   audit_logs
--   payment_allocations
--   payment_transactions
--   attendance_records
--   registrations
--   expenses
--   activities
--
-- ⚠️ 這是不可逆操作，執行前請務必先備份！
--   建議：Supabase Dashboard → Database → Backups 建立一次快照，
--   或先用 supabase/scripts/backup_before_clean.sql 確認目前筆數、
--   到 Table Editor 個別匯出 CSV。
-- ============================================================

BEGIN;

-- 1. 操作紀錄
DELETE FROM public.audit_logs;

-- 2. 付款分配（需先於 payment_transactions / attendance_records 清除）
DELETE FROM public.payment_allocations;

-- 3. 收款交易
DELETE FROM public.payment_transactions;

-- 4. 出席紀錄（需先於 activities 清除，activity_id 為 RESTRICT）
DELETE FROM public.attendance_records;

-- 5. 報名紀錄
DELETE FROM public.registrations;

-- 6. 支出紀錄
DELETE FROM public.expenses;

-- 7. 活動（上述所有參照活動的資料清除後才能刪）
DELETE FROM public.activities;

COMMIT;

-- ── 驗收查詢 ────────────────────────────────────────────────
SELECT 'members (應維持不變)'          AS t, COUNT(*) FROM public.members
UNION ALL
SELECT 'seasons (應維持不變)',          COUNT(*) FROM public.seasons
UNION ALL
SELECT 'fee_rules (應維持不變)',        COUNT(*) FROM public.fee_rules
UNION ALL
SELECT 'activities (應為 0)',           COUNT(*) FROM public.activities
UNION ALL
SELECT 'registrations (應為 0)',        COUNT(*) FROM public.registrations
UNION ALL
SELECT 'attendance_records (應為 0)',   COUNT(*) FROM public.attendance_records
UNION ALL
SELECT 'payment_transactions (應為 0)', COUNT(*) FROM public.payment_transactions
UNION ALL
SELECT 'payment_allocations (應為 0)',  COUNT(*) FROM public.payment_allocations
UNION ALL
SELECT 'expenses (應為 0)',             COUNT(*) FROM public.expenses
UNION ALL
SELECT 'audit_logs (應為 0)',           COUNT(*) FROM public.audit_logs;
