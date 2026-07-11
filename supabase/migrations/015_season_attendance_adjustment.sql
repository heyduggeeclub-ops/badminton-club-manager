-- ============================================================
-- 015_season_attendance_adjustment.sql
-- 「本季系統外已出席次數」校正
--
-- 背景：如果球隊在季度中途才開始使用系統（例如季度是 6-9 月，
--       但 7 月才開始用系統打卡），系統原本只會從「系統內第一次
--       打卡」開始算本季出席次序，導致牌位／收費從第 1 次重新算，
--       跟現實生活中已經照牌位收費的狀況對不起來。
--
-- 作法：新增 member_season_adjustments 表，讓管理員可以針對
--       「某會員 + 某季」手動輸入一個「系統外已出席次數」，
--       get_season_sequence() 會把這個數字加進去，讓系統打卡的
--       次序從正確的次數繼續算，收費與牌位都會對。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.member_season_adjustments (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id               UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  season_id               UUID        NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  prior_attendance_count  INTEGER     NOT NULL DEFAULT 0 CHECK (prior_attendance_count >= 0),
  note                    TEXT,
  created_by              UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_member_season_adjustments UNIQUE (member_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_member_season_adj_season ON public.member_season_adjustments(season_id);

CREATE OR REPLACE TRIGGER trg_member_season_adjustments_updated_at
  BEFORE UPDATE ON public.member_season_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.member_season_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.member_season_adjustments
  FOR ALL USING (public.get_current_member_role() IN ('leader', 'vice_leader'));

CREATE POLICY member_read_own_season_adjustments ON public.member_season_adjustments
  FOR SELECT USING (
    member_id = (SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1)
    OR public.get_current_member_role() IN ('leader', 'vice_leader')
  );

-- ── 更新 get_season_sequence：系統內筆數 + 1 + 季初校正值 ──────
CREATE OR REPLACE FUNCTION public.get_season_sequence(
  p_member_id     UUID,
  p_season_id     UUID,
  p_activity_date DATE
) RETURNS INTEGER AS $$
  SELECT COALESCE(COUNT(*), 0)::INTEGER + 1 + COALESCE((
    SELECT prior_attendance_count
    FROM public.member_season_adjustments
    WHERE member_id = p_member_id AND season_id = p_season_id
  ), 0)
  FROM public.attendance_records ar
  JOIN public.activities a ON a.id = ar.activity_id
  WHERE ar.member_id   = p_member_id
    AND ar.season_id   = p_season_id
    AND ar.checked_in  = TRUE
    AND a.activity_date < p_activity_date;
$$ LANGUAGE SQL STABLE;
