-- ============================================================
-- export_for_restore.sql
-- 在清除資料「之前」執行，把目前活動資料輸出成 INSERT 語句
--
-- ⚠️  members 不在備份範圍內：
--     清除後請重新在系統內建立會員資料並綁定帳號。
--     團長日後使用自己的帳號自行註冊。
--
-- 使用步驟：
--   1. 在 Supabase SQL Editor 執行下面的 SELECT
--   2. 點選結果右上角「Download CSV」或複製結果
--
-- 還原步驟：
--   把當初存好的 INSERT 語句貼回 SQL Editor 執行即可
--   （注意順序：activities → registrations →
--     attendance_records → payment_transactions → expenses）
-- ============================================================

-- ── 1. 輸出 activities INSERT 語句 ─────────────────────────
SELECT
  'INSERT INTO public.activities (id, season_id, fee_rule_id, activity_date, start_time, end_time, venue_name, court_count, max_per_court, status, notes, created_at, updated_at) VALUES (''' ||
  id || ''', ''' ||
  season_id || ''', ' ||
  COALESCE('''' || fee_rule_id || '''', 'NULL') || ', ' ||
  COALESCE('''' || activity_date || '''', 'NULL') || ', ''' ||
  start_time || ''', ''' ||
  end_time || ''', ''' ||
  venue_name || ''', ' ||
  court_count || ', ' ||
  max_per_court || ', ''' ||
  status || ''', ' ||
  COALESCE('''' || notes || '''', 'NULL') || ', ''' ||
  created_at || ''', ''' ||
  updated_at || ''') ON CONFLICT (id) DO NOTHING;'
  AS restore_sql
FROM public.activities
ORDER BY activity_date;
