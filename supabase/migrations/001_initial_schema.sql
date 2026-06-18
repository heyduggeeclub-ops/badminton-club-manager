-- ============================================================
-- 羽球隊管理系統 — Initial Schema Migration
-- Version: 001 | Date: 2026-06-17
-- 執行方式: Supabase Dashboard → SQL Editor → 貼上執行
-- ============================================================

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. members（會員）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.members (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  name           TEXT        NOT NULL,
  display_name   TEXT,
  gender         TEXT        NOT NULL DEFAULT 'male',
  role           TEXT        NOT NULL DEFAULT 'member',
  status         TEXT        NOT NULL DEFAULT 'active',
  phone          TEXT,
  line_id        TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_members_gender  CHECK (gender IN ('male', 'female')),
  CONSTRAINT chk_members_role    CHECK (role   IN ('member', 'vice_leader', 'leader')),
  CONSTRAINT chk_members_status  CHECK (status IN ('active', 'inactive', 'pending'))
);

-- ============================================================
-- 2. seasons（季度）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seasons (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  year         INTEGER NOT NULL,
  quarter      INTEGER NOT NULL,
  start_date   DATE    NOT NULL,
  end_date     DATE    NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_seasons_year_quarter UNIQUE (year, quarter),
  CONSTRAINT chk_seasons_quarter     CHECK (quarter BETWEEN 1 AND 4),
  CONSTRAINT chk_seasons_dates       CHECK (start_date < end_date)
);

-- ============================================================
-- 3. fee_rules（收費規則版本）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_rules (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  effective_from DATE        NOT NULL,
  effective_to   DATE,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by     UUID        REFERENCES public.members(id) ON DELETE RESTRICT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_fee_rules_dates CHECK (effective_to IS NULL OR effective_from < effective_to)
);

-- ============================================================
-- 4. fee_rule_tiers（收費階梯）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_rule_tiers (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_rule_id      UUID    NOT NULL REFERENCES public.fee_rules(id) ON DELETE CASCADE,
  gender           TEXT    NOT NULL DEFAULT 'male',
  attendance_from  INTEGER NOT NULL,
  attendance_to    INTEGER,
  amount           INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_fee_tier_gender  CHECK (gender IN ('male', 'female', 'all')),
  CONSTRAINT chk_fee_tier_from    CHECK (attendance_from >= 1),
  CONSTRAINT chk_fee_tier_range   CHECK (attendance_to IS NULL OR attendance_from <= attendance_to),
  CONSTRAINT chk_fee_tier_amount  CHECK (amount >= 0)
);

-- ============================================================
-- 5. activities（活動）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id      UUID        NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
  fee_rule_id    UUID        REFERENCES public.fee_rules(id) ON DELETE RESTRICT,
  activity_date  DATE        NOT NULL,
  start_time     TIME        NOT NULL,
  end_time       TIME        NOT NULL,
  venue_name     TEXT        NOT NULL,
  court_count    INTEGER     NOT NULL DEFAULT 3,
  max_per_court  INTEGER     NOT NULL DEFAULT 8,
  status         TEXT        NOT NULL DEFAULT 'draft',
  notes          TEXT,
  created_by     UUID        REFERENCES public.members(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_activities_status        CHECK (status IN ('draft', 'open', 'closed', 'completed', 'cancelled')),
  CONSTRAINT chk_activities_court_count   CHECK (court_count >= 1),
  CONSTRAINT chk_activities_max_per_court CHECK (max_per_court >= 1),
  CONSTRAINT chk_activities_times         CHECK (start_time < end_time)
);

-- ============================================================
-- 6. registrations（報名紀錄）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.registrations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id      UUID        NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  member_id        UUID        NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  registered_by    UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'confirmed',
  waitlist_position INTEGER,
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source           TEXT        NOT NULL DEFAULT 'admin',
  raw_name         TEXT,
  promoted_at      TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  cancelled_reason TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_registrations_activity_member UNIQUE (activity_id, member_id),
  CONSTRAINT chk_registrations_status CHECK (status IN ('confirmed', 'waitlist', 'cancelled', 'promoted')),
  CONSTRAINT chk_registrations_source CHECK (source IN ('self', 'line_import', 'admin'))
);

-- ============================================================
-- 7. attendance_records（出席打卡）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  UUID        REFERENCES public.registrations(id) ON DELETE SET NULL,
  activity_id      UUID        NOT NULL REFERENCES public.activities(id) ON DELETE RESTRICT,
  member_id        UUID        NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  season_id        UUID        NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
  fee_rule_id      UUID        REFERENCES public.fee_rules(id) ON DELETE RESTRICT,
  checked_in_by    UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  checked_in       BOOLEAN     NOT NULL DEFAULT FALSE,
  checked_in_at    TIMESTAMPTZ,
  season_sequence  INTEGER,
  fee_amount       INTEGER,
  payment_status   TEXT        NOT NULL DEFAULT 'pending',
  paid_amount      INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_attendance_activity_member    UNIQUE (activity_id, member_id),
  CONSTRAINT chk_attendance_payment_status    CHECK (payment_status IN ('pending', 'paid', 'partial', 'waived')),
  CONSTRAINT chk_attendance_paid_amount       CHECK (paid_amount >= 0),
  CONSTRAINT chk_attendance_fee_amount        CHECK (fee_amount IS NULL OR fee_amount >= 0)
);

-- ============================================================
-- 8. payment_transactions（收款交易）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID        NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  activity_id     UUID        REFERENCES public.activities(id) ON DELETE SET NULL,
  collected_by    UUID        REFERENCES public.members(id) ON DELETE RESTRICT,
  amount          INTEGER     NOT NULL,
  payment_method  TEXT        NOT NULL DEFAULT 'cash',
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_payment_tx_amount CHECK (amount > 0),
  CONSTRAINT chk_payment_tx_method CHECK (payment_method IN ('cash', 'transfer', 'other'))
);

-- ============================================================
-- 9. payment_allocations（付款分配）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id  UUID    NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  attendance_record_id    UUID    NOT NULL REFERENCES public.attendance_records(id) ON DELETE RESTRICT,
  amount                  INTEGER NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_payment_alloc  UNIQUE (payment_transaction_id, attendance_record_id),
  CONSTRAINT chk_payment_alloc_amount CHECK (amount > 0)
);

-- ============================================================
-- 10. expenses（支出）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id   UUID        REFERENCES public.activities(id) ON DELETE SET NULL,
  season_id     UUID        NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
  recorded_by   UUID        REFERENCES public.members(id) ON DELETE RESTRICT,
  category      TEXT        NOT NULL DEFAULT 'other',
  amount        INTEGER     NOT NULL,
  description   TEXT        NOT NULL,
  expense_date  DATE        NOT NULL,
  receipt_url   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_expenses_category CHECK (category IN ('venue_rental', 'shuttlecock', 'drinks', 'other')),
  CONSTRAINT chk_expenses_amount   CHECK (amount > 0)
);

-- ============================================================
-- 11. audit_logs（操作紀錄）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  action       TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    UUID,
  old_data     JSONB,
  new_data     JSONB,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_members_user_id       ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_status        ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_role          ON public.members(role);
CREATE INDEX IF NOT EXISTS idx_members_display_name  ON public.members(display_name);

CREATE INDEX IF NOT EXISTS idx_seasons_year_quarter  ON public.seasons(year, quarter);

CREATE INDEX IF NOT EXISTS idx_fee_rules_active      ON public.fee_rules(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_fee_rule_tiers_rule   ON public.fee_rule_tiers(fee_rule_id, gender);

CREATE INDEX IF NOT EXISTS idx_activities_season_id  ON public.activities(season_id);
CREATE INDEX IF NOT EXISTS idx_activities_date        ON public.activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_status      ON public.activities(status);

CREATE INDEX IF NOT EXISTS idx_registrations_activity ON public.registrations(activity_id);
CREATE INDEX IF NOT EXISTS idx_registrations_member   ON public.registrations(member_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status   ON public.registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_waitlist ON public.registrations(activity_id, registered_at)
  WHERE status = 'waitlist';

CREATE INDEX IF NOT EXISTS idx_attendance_activity    ON public.attendance_records(activity_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member      ON public.attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_season      ON public.attendance_records(season_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_season ON public.attendance_records(member_id, season_id);
CREATE INDEX IF NOT EXISTS idx_attendance_unpaid      ON public.attendance_records(member_id, payment_status)
  WHERE payment_status IN ('pending', 'partial');

CREATE INDEX IF NOT EXISTS idx_expenses_season        ON public.expenses(season_id);
CREATE INDEX IF NOT EXISTS idx_expenses_activity      ON public.expenses(activity_id);

CREATE INDEX IF NOT EXISTS idx_audit_entity           ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at       ON public.audit_logs(created_at DESC);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE OR REPLACE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE OR REPLACE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE OR REPLACE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE OR REPLACE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- 計算季度出席次序
CREATE OR REPLACE FUNCTION public.get_season_sequence(
  p_member_id    UUID,
  p_season_id    UUID,
  p_activity_date DATE
) RETURNS INTEGER AS $$
  SELECT COALESCE(COUNT(*), 0)::INTEGER + 1
  FROM public.attendance_records ar
  JOIN public.activities a ON a.id = ar.activity_id
  WHERE ar.member_id   = p_member_id
    AND ar.season_id   = p_season_id
    AND ar.checked_in  = TRUE
    AND a.activity_date < p_activity_date;
$$ LANGUAGE SQL STABLE;

-- 依費率、性別、次序查詢費用
CREATE OR REPLACE FUNCTION public.get_fee_amount(
  p_fee_rule_id     UUID,
  p_gender          TEXT,
  p_season_sequence INTEGER
) RETURNS INTEGER AS $$
  SELECT amount
  FROM public.fee_rule_tiers
  WHERE fee_rule_id     = p_fee_rule_id
    AND gender          IN (p_gender, 'all')
    AND attendance_from <= p_season_sequence
    AND (attendance_to IS NULL OR attendance_to >= p_season_sequence)
  ORDER BY gender DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.member_debt_summary AS
SELECT
  ar.member_id,
  m.name,
  m.display_name,
  m.gender,
  COUNT(*) FILTER (WHERE ar.payment_status IN ('pending', 'partial'))  AS unpaid_sessions,
  COALESCE(
    SUM(ar.fee_amount - ar.paid_amount)
      FILTER (WHERE ar.payment_status IN ('pending', 'partial')), 0
  ) AS total_owed
FROM public.attendance_records ar
JOIN public.members m ON m.id = ar.member_id
WHERE ar.checked_in = TRUE
GROUP BY ar.member_id, m.name, m.display_name, m.gender;

CREATE OR REPLACE VIEW public.activity_financials AS
SELECT
  a.id            AS activity_id,
  a.activity_date,
  a.venue_name,
  a.season_id,
  a.status,
  COALESCE(income.attended_count, 0)   AS attended_count,
  COALESCE(income.total_income,   0)   AS total_income,
  COALESCE(exp.total_expense,     0)   AS total_expense,
  COALESCE(income.total_income,   0) - COALESCE(exp.total_expense, 0) AS profit
FROM public.activities a
LEFT JOIN (
  SELECT activity_id,
         COUNT(*) FILTER (WHERE checked_in = TRUE) AS attended_count,
         SUM(paid_amount) AS total_income
  FROM public.attendance_records
  GROUP BY activity_id
) income ON income.activity_id = a.id
LEFT JOIN (
  SELECT activity_id, SUM(amount) AS total_expense
  FROM public.expenses
  WHERE activity_id IS NOT NULL
  GROUP BY activity_id
) exp ON exp.activity_id = a.id;

CREATE OR REPLACE VIEW public.season_financials AS
SELECT
  s.id AS season_id,
  s.year,
  s.quarter,
  COUNT(DISTINCT a.id)                                AS activity_count,
  COALESCE(SUM(ar.paid_amount), 0)                   AS total_income,
  COALESCE(exp.total_expense, 0)                     AS total_expense,
  COALESCE(SUM(ar.paid_amount), 0) - COALESCE(exp.total_expense, 0) AS profit
FROM public.seasons s
LEFT JOIN public.activities a ON a.season_id = s.id
LEFT JOIN public.attendance_records ar ON ar.season_id = s.id AND ar.checked_in = TRUE
LEFT JOIN (
  SELECT season_id, SUM(amount) AS total_expense FROM public.expenses GROUP BY season_id
) exp ON exp.season_id = s.id
GROUP BY s.id, s.year, s.quarter, exp.total_expense;

-- ============================================================
-- SEED: 初始季度資料（2024–2026）
-- ============================================================

INSERT INTO public.seasons (year, quarter, start_date, end_date) VALUES
  (2024, 1, '2024-01-01', '2024-03-31'),
  (2024, 2, '2024-04-01', '2024-06-30'),
  (2024, 3, '2024-07-01', '2024-09-30'),
  (2024, 4, '2024-10-01', '2024-12-31'),
  (2025, 1, '2025-01-01', '2025-03-31'),
  (2025, 2, '2025-04-01', '2025-06-30'),
  (2025, 3, '2025-07-01', '2025-09-30'),
  (2025, 4, '2025-10-01', '2025-12-31'),
  (2026, 1, '2026-01-01', '2026-03-31'),
  (2026, 2, '2026-04-01', '2026-06-30'),
  (2026, 3, '2026-07-01', '2026-09-30'),
  (2026, 4, '2026-10-01', '2026-12-31')
ON CONFLICT (year, quarter) DO NOTHING;

-- ============================================================
-- SEED: 預設收費規則
-- ============================================================

WITH new_rule AS (
  INSERT INTO public.fee_rules (name, effective_from, is_active, notes)
  VALUES ('初始費率 2024', '2024-01-01', TRUE, '系統預設費率')
  RETURNING id
)
INSERT INTO public.fee_rule_tiers (fee_rule_id, gender, attendance_from, attendance_to, amount)
SELECT id, 'male',   1, 1,    240 FROM new_rule UNION ALL
SELECT id, 'male',   2, 2,    230 FROM new_rule UNION ALL
SELECT id, 'male',   3, NULL, 220 FROM new_rule UNION ALL
SELECT id, 'female', 1, 1,    220 FROM new_rule UNION ALL
SELECT id, 'female', 2, 2,    210 FROM new_rule UNION ALL
SELECT id, 'female', 3, NULL, 200 FROM new_rule;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_rule_tiers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;

-- Helper function: 取得目前登入者的 member record
CREATE OR REPLACE FUNCTION public.get_current_member_role()
RETURNS TEXT AS $$
  SELECT role FROM public.members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 管理員（leader / vice_leader）可讀寫所有資料
CREATE POLICY admin_all ON public.members
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.seasons
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.fee_rules
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.fee_rule_tiers
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.activities
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.registrations
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.attendance_records
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.payment_transactions
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.payment_allocations
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.expenses
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY admin_all ON public.audit_logs
  FOR SELECT USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

-- 一般球友：只能讀取自己的資料
CREATE POLICY member_read_self ON public.members
  FOR SELECT USING (user_id = auth.uid() OR public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY member_read_seasons ON public.seasons
  FOR SELECT USING (TRUE);

CREATE POLICY member_read_fee_rules ON public.fee_rules
  FOR SELECT USING (TRUE);

CREATE POLICY member_read_activities ON public.activities
  FOR SELECT USING (TRUE);

CREATE POLICY member_read_own_registrations ON public.registrations
  FOR SELECT USING (member_id = (SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY member_read_own_attendance ON public.attendance_records
  FOR SELECT USING (member_id = (SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1));
