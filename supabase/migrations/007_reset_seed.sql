-- ============================================================
-- 007_reset_seed.sql
-- 清除所有測試資料，重新建立乾淨的基本資料
-- 執行前請確認：003、004、005、006 migration 已執行
-- ============================================================

DO $$
DECLARE
  -- 季度
  sid_q2   UUID := gen_random_uuid();
  sid_q3   UUID := gen_random_uuid();

  -- 收費規則
  fr_id    UUID := gen_random_uuid();

  -- 會員
  m_chen   UUID := gen_random_uuid();  -- 陳志明 (團長)
  m_lin    UUID := gen_random_uuid();  -- 林雅慧 (副團長)
  m_wang   UUID := gen_random_uuid();  -- 王建宏
  m_zhang  UUID := gen_random_uuid();  -- 張淑芬
  m_li     UUID := gen_random_uuid();  -- 李威廷
  m_wu     UUID := gen_random_uuid();  -- 吳美君

  -- 活動
  act_606  UUID := gen_random_uuid();  -- 2026-06-06 已完成
  act_613  UUID := gen_random_uuid();  -- 2026-06-13 已完成
  act_620  UUID := gen_random_uuid();  -- 2026-06-20 開放報名

  -- 出席紀錄 (Jun 6)
  ar_606_chen  UUID := gen_random_uuid();
  ar_606_lin   UUID := gen_random_uuid();
  ar_606_wang  UUID := gen_random_uuid();
  ar_606_zhang UUID := gen_random_uuid();  -- 欠款

  -- 出席紀錄 (Jun 13)
  ar_613_chen  UUID := gen_random_uuid();
  ar_613_lin   UUID := gen_random_uuid();
  ar_613_wang  UUID := gen_random_uuid();
  ar_613_li    UUID := gen_random_uuid();  -- 欠款

  -- 收費紀錄
  pt1 UUID := gen_random_uuid();
  pt2 UUID := gen_random_uuid();
  pt3 UUID := gen_random_uuid();
  pt4 UUID := gen_random_uuid();
  pt5 UUID := gen_random_uuid();
  pt6 UUID := gen_random_uuid();

BEGIN

-- ============================================================
-- 清除所有資料
-- ============================================================
TRUNCATE TABLE
  public.audit_logs,
  public.payment_allocations,
  public.payment_transactions,
  public.attendance_records,
  public.registrations,
  public.expenses,
  public.activities,
  public.fee_rule_tiers,
  public.fee_rules,
  public.members,
  public.seasons
CASCADE;

-- ============================================================
-- 季度
-- ============================================================
INSERT INTO public.seasons (id, year, quarter, start_date, end_date) VALUES
  (sid_q2, 2026, 2, '2026-04-01', '2026-05-31'),
  (sid_q3, 2026, 3, '2026-06-01', '2026-08-31');

-- ============================================================
-- 收費規則
-- ============================================================
INSERT INTO public.fee_rules (id, name, effective_from, is_active) VALUES
  (fr_id, '標準收費 2026', '2026-01-01', TRUE);

INSERT INTO public.fee_rule_tiers (fee_rule_id, gender, attendance_from, attendance_to, amount) VALUES
  (fr_id, 'male',   1, 1,    240),
  (fr_id, 'male',   2, 2,    230),
  (fr_id, 'male',   3, NULL, 220),
  (fr_id, 'female', 1, 1,    220),
  (fr_id, 'female', 2, 2,    210),
  (fr_id, 'female', 3, NULL, 200);

-- ============================================================
-- 會員
-- ============================================================
INSERT INTO public.members (id, name, display_name, gender, role, status) VALUES
  (m_chen,  '陳志明', '明哥', 'male',   'leader',      'active'),
  (m_lin,   '林雅慧', '慧姐', 'female', 'vice_leader', 'active'),
  (m_wang,  '王建宏', NULL,   'male',   'member',      'active'),
  (m_zhang, '張淑芬', NULL,   'female', 'member',      'active'),
  (m_li,    '李威廷', NULL,   'male',   'member',      'active'),
  (m_wu,    '吳美君', NULL,   'female', 'member',      'active');

-- ============================================================
-- 活動
-- ============================================================
INSERT INTO public.activities
  (id, season_id, fee_rule_id, activity_date, start_time, end_time, venue_name, court_count, max_per_court, status)
VALUES
  (act_606, sid_q3, fr_id, '2026-06-06', '19:00', '21:00', '大安運動中心', 3, 8, 'completed'),
  (act_613, sid_q3, fr_id, '2026-06-13', '19:00', '21:00', '大安運動中心', 3, 8, 'completed'),
  (act_620, sid_q3, fr_id, '2026-06-20', '19:00', '21:00', '大安運動中心', 3, 8, 'open');

-- ============================================================
-- 出席紀錄 — 2026-06-06
-- 出席：陳志明、林雅慧、王建宏（已付）、張淑芬（未付）
-- ============================================================
INSERT INTO public.attendance_records
  (id, activity_id, member_id, season_id, fee_rule_id,
   checked_in, checked_in_at, season_sequence, fee_amount, payment_status, paid_amount)
VALUES
  (ar_606_chen,  act_606, m_chen,  sid_q3, fr_id, TRUE, '2026-06-06 19:05:00+08', 1, 240, 'paid',    240),
  (ar_606_lin,   act_606, m_lin,   sid_q3, fr_id, TRUE, '2026-06-06 19:07:00+08', 1, 220, 'paid',    220),
  (ar_606_wang,  act_606, m_wang,  sid_q3, fr_id, TRUE, '2026-06-06 19:10:00+08', 1, 240, 'paid',    240),
  (ar_606_zhang, act_606, m_zhang, sid_q3, fr_id, TRUE, '2026-06-06 19:12:00+08', 1, 220, 'pending', 0);

-- ============================================================
-- 出席紀錄 — 2026-06-13
-- 出席：陳志明、林雅慧、王建宏（已付）、李威廷（未付）
-- ============================================================
INSERT INTO public.attendance_records
  (id, activity_id, member_id, season_id, fee_rule_id,
   checked_in, checked_in_at, season_sequence, fee_amount, payment_status, paid_amount)
VALUES
  (ar_613_chen, act_613, m_chen, sid_q3, fr_id, TRUE, '2026-06-13 19:05:00+08', 2, 230, 'paid',    230),
  (ar_613_lin,  act_613, m_lin,  sid_q3, fr_id, TRUE, '2026-06-13 19:08:00+08', 2, 210, 'paid',    210),
  (ar_613_wang, act_613, m_wang, sid_q3, fr_id, TRUE, '2026-06-13 19:10:00+08', 2, 230, 'paid',    230),
  (ar_613_li,   act_613, m_li,   sid_q3, fr_id, TRUE, '2026-06-13 19:15:00+08', 1, 240, 'pending', 0);

-- ============================================================
-- 收費紀錄（已付款的出席）
-- ============================================================
INSERT INTO public.payment_transactions
  (id, member_id, activity_id, amount, payment_method, type, paid_at)
VALUES
  (pt1, m_chen, act_606, 240, 'cash', 'payment', '2026-06-06 19:05:00+08'),
  (pt2, m_lin,  act_606, 220, 'cash', 'payment', '2026-06-06 19:07:00+08'),
  (pt3, m_wang, act_606, 240, 'cash', 'payment', '2026-06-06 19:10:00+08'),
  (pt4, m_chen, act_613, 230, 'cash', 'payment', '2026-06-13 19:05:00+08'),
  (pt5, m_lin,  act_613, 210, 'cash', 'payment', '2026-06-13 19:08:00+08'),
  (pt6, m_wang, act_613, 230, 'cash', 'payment', '2026-06-13 19:10:00+08');

-- 付款分配
INSERT INTO public.payment_allocations
  (payment_transaction_id, attendance_record_id, amount)
VALUES
  (pt1, ar_606_chen, 240),
  (pt2, ar_606_lin,  220),
  (pt3, ar_606_wang, 240),
  (pt4, ar_613_chen, 230),
  (pt5, ar_613_lin,  210),
  (pt6, ar_613_wang, 230);

-- ============================================================
-- 報名（2026-06-20 活動）
-- ============================================================
INSERT INTO public.registrations
  (activity_id, member_id, status, source, registered_at)
VALUES
  (act_620, m_chen,  'confirmed', 'admin', '2026-06-17 10:00:00+08'),
  (act_620, m_lin,   'confirmed', 'admin', '2026-06-17 10:01:00+08'),
  (act_620, m_wang,  'confirmed', 'admin', '2026-06-17 10:02:00+08'),
  (act_620, m_zhang, 'confirmed', 'admin', '2026-06-17 10:03:00+08'),
  (act_620, m_li,    'confirmed', 'admin', '2026-06-17 10:04:00+08');

-- ============================================================
-- 支出
-- ============================================================
INSERT INTO public.expenses
  (season_id, activity_id, category, amount, description, expense_date)
VALUES
  (sid_q3, act_606, 'venue_rental', 1200, '大安運動中心場租（3場地×2小時）', '2026-06-06'),
  (sid_q3, act_613, 'venue_rental', 1200, '大安運動中心場租（3場地×2小時）', '2026-06-13'),
  (sid_q3, act_613, 'shuttlecock',   300, '羽球補充（10打）',               '2026-06-13');

-- ============================================================
-- 自動連結 auth user → 陳志明（團長）
-- 讓 get_current_member_role() 回傳 'leader'，RLS 才能通過
-- ============================================================
UPDATE public.members
SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
WHERE name = '陳志明';

END $$;
