-- ============================================================
-- 002_seed_test_data.sql — 測試資料
-- 用途：在開發環境快速建立可驗證出席收費功能的測試資料
-- 注意：請在完成 001_initial_schema.sql 後執行
-- ============================================================

-- ============================================================
-- STEP 1: 新增測試會員（6人：4男2女，無 user_id，僅供管理）
-- ============================================================

INSERT INTO public.members (name, display_name, gender, role, status, notes)
VALUES
  ('陳志明', '阿明',   'male',   'member', 'active', '測試資料'),
  ('林大維', '大維',   'male',   'member', 'active', '測試資料'),
  ('王建國', '建國',   'male',   'member', 'active', '測試資料'),
  ('張文雄', '阿雄',   'male',   'member', 'active', '測試資料'),
  ('李美玲', '美玲',   'female', 'member', 'active', '測試資料'),
  ('吳雅婷', '雅婷',   'female', 'member', 'active', '測試資料')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 2: 建立測試活動（本週六，2026-06-20，狀態：open）
-- ============================================================

-- 取得 2026 Q2 季度 ID
-- 取得預設費率 ID
-- 建立活動

WITH season AS (
  -- 6 月已併入 Q3（參見 004_season_dates.sql）
  SELECT id FROM public.seasons WHERE year = 2026 AND quarter = 3
),
fee_rule AS (
  SELECT id FROM public.fee_rules WHERE is_active = TRUE ORDER BY created_at LIMIT 1
)
INSERT INTO public.activities (
  season_id, fee_rule_id, activity_date, start_time, end_time,
  venue_name, court_count, max_per_court, status, notes
)
SELECT
  season.id,
  fee_rule.id,
  '2026-06-20',
  '18:00',
  '21:00',
  '師大附中體育館',
  4,
  4,
  'open',
  '測試活動 — 可用於驗證出席收費功能'
FROM season, fee_rule
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 3: 建立測試報名記錄（6人全部正取）
-- ============================================================

WITH activity AS (
  SELECT id FROM public.activities
  WHERE activity_date = '2026-06-20' AND venue_name = '師大附中體育館'
  LIMIT 1
),
members_list AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.members
  WHERE notes = '測試資料'
)
INSERT INTO public.registrations (
  activity_id, member_id, status, source, registered_at
)
SELECT
  activity.id,
  members_list.id,
  'confirmed',
  'admin',
  NOW() - (INTERVAL '1 hour' * members_list.rn)
FROM activity, members_list
ON CONFLICT (activity_id, member_id) DO NOTHING;

-- ============================================================
-- STEP 4: 建立既有欠款（讓大維有舊欠款，驗證欠款顯示）
-- ============================================================

-- 建立一個舊的活動出席記錄（上週，狀態 pending = 欠款）
WITH old_activity AS (
  SELECT id, season_id, fee_rule_id FROM public.activities
  WHERE activity_date = '2026-06-20' AND venue_name = '師大附中體育館'
  LIMIT 1
),
dawei AS (
  SELECT id FROM public.members WHERE display_name = '大維' AND notes = '測試資料' LIMIT 1
),
season AS (
  -- 6 月已併入 Q3（參見 004_season_dates.sql）
  SELECT id FROM public.seasons WHERE year = 2026 AND quarter = 3
)
INSERT INTO public.attendance_records (
  activity_id, member_id, season_id, fee_rule_id,
  checked_in, checked_in_at, season_sequence,
  fee_amount, payment_status, paid_amount
)
-- 注意：這裡直接建一筆欠款記錄附在這個活動上（用於示範；正式環境應有獨立的舊活動）
-- 改用 member_debt_summary view 會自動計算
SELECT
  old_activity.id,
  dawei.id,
  season.id,
  old_activity.fee_rule_id,
  TRUE,
  NOW() - INTERVAL '7 days',
  1,
  230,
  'pending',   -- 未付 = 欠款
  0
FROM old_activity, dawei, season
ON CONFLICT (activity_id, member_id) DO NOTHING;

-- ============================================================
-- 驗證查詢（執行後確認資料正確）
-- ============================================================

-- 確認活動建立成功
-- SELECT id, activity_date, venue_name, status FROM public.activities WHERE notes LIKE '%測試%';

-- 確認報名人數
-- SELECT COUNT(*) AS reg_count FROM public.registrations r
-- JOIN public.activities a ON a.id = r.activity_id
-- WHERE a.activity_date = '2026-06-20' AND r.status = 'confirmed';

-- 確認欠款
-- SELECT * FROM public.member_debt_summary;

-- ============================================================
-- 完成！
-- 開啟 http://localhost:3000/attendance 應可看到這場活動
-- ============================================================
