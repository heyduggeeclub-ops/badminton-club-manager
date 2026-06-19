-- ============================================================
-- export_for_restore.sql
-- 在清除資料「之前」執行，把目前資料輸出成 INSERT 語句
--
-- 使用步驟：
--   1. 在 Supabase SQL Editor 分別執行下面每個 SELECT
--   2. 點選結果右上角「Download CSV」或複製結果
--   3. 或者直接把下方每段 SELECT 的結果手動記錄
--
-- 還原步驟：
--   把當初存好的 INSERT 語句貼回 SQL Editor 執行即可
--   （注意順序：members → activities → registrations →
--     attendance_records → payment_transactions → expenses）
-- ============================================================

-- ── 1. 輸出 members INSERT 語句 ────────────────────────────
SELECT
  'INSERT INTO public.members (id, user_id, name, display_name, gender, role, status, notes, created_at, updated_at) VALUES (''' ||
  id || ''', ' ||
  COALESCE('''' || user_id || '''', 'NULL') || ', ''' ||
  name || ''', ' ||
  COALESCE('''' || display_name || '''', 'NULL') || ', ''' ||
  gender || ''', ''' ||
  role || ''', ''' ||
  status || ''', ' ||
  COALESCE('''' || notes || '''', 'NULL') || ', ''' ||
  created_at || ''', ''' ||
  updated_at || ''') ON CONFLICT (id) DO NOTHING;'
  AS restore_sql
FROM public.members
ORDER BY created_at;

-- ── 2. 輸出 activities INSERT 語句 ─────────────────────────
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
