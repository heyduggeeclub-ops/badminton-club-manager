-- ============================================================
-- backup_before_clean.sql
-- 執行前備份：把目前資料輸出成可還原的 INSERT 語句
--
-- 使用方法：
--   1. 在 Supabase Dashboard → SQL Editor 執行此腳本
--   2. 把結果另存為 .sql 檔案（點 Export 或手動複製）
--   3. 之後要還原，把存好的 INSERT 腳本貼回 SQL Editor 執行
-- ============================================================

-- ── 查看目前有哪些資料 ──────────────────────────────────────
SELECT 'members'              AS table_name, COUNT(*) AS rows FROM public.members
UNION ALL
SELECT 'seasons',                            COUNT(*) FROM public.seasons
UNION ALL
SELECT 'fee_rules',                          COUNT(*) FROM public.fee_rules
UNION ALL
SELECT 'activities',                         COUNT(*) FROM public.activities
UNION ALL
SELECT 'registrations',                      COUNT(*) FROM public.registrations
UNION ALL
SELECT 'attendance_records',                 COUNT(*) FROM public.attendance_records
UNION ALL
SELECT 'payment_transactions',               COUNT(*) FROM public.payment_transactions
UNION ALL
SELECT 'expenses',                           COUNT(*) FROM public.expenses;
