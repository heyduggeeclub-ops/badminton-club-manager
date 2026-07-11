-- ============================================================
-- 014_guest_fee.sql
-- 新增「臨打費用（非會員）」：男/女固定金額，可於收費規則內調整
-- 背景：原本的費率階梯（fee_rule_tiers）以「本季第幾次出席」計價，
--       是針對既有會員設計的；外部臨打的人不應套用會員的階梯次序，
--       而是固定金額（預設 男 250 / 女 230）。
-- 作法：比照既有 leader_fee / vice_leader_fee 的「角色固定金額」模式，
--       在 members.role 新增 'guest' 值，並在 fee_rules 新增
--       guest_fee_male / guest_fee_female 兩個固定金額欄位。
-- ============================================================

-- 1. members.role 允許 'guest'（臨打／非會員）
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS chk_members_role;
ALTER TABLE public.members
  ADD CONSTRAINT chk_members_role CHECK (role IN ('member', 'vice_leader', 'leader', 'guest'));

-- 2. fee_rules 新增臨打固定費用欄位（NOT NULL，永遠有值，可調整）
ALTER TABLE public.fee_rules
  ADD COLUMN IF NOT EXISTS guest_fee_male   INTEGER NOT NULL DEFAULT 250 CHECK (guest_fee_male   >= 0),
  ADD COLUMN IF NOT EXISTS guest_fee_female INTEGER NOT NULL DEFAULT 230 CHECK (guest_fee_female >= 0);

-- 3. 更新 get_fee_amount：p_role = 'guest' 時，依性別回傳固定臨打費用
--    （優先序：leader/vice_leader 固定費用 → guest 固定費用 → 一般階梯費率）
CREATE OR REPLACE FUNCTION public.get_fee_amount(
  p_fee_rule_id     UUID,
  p_gender          TEXT,
  p_season_sequence INTEGER,
  p_role            TEXT DEFAULT 'member'
) RETURNS INTEGER AS $$
  SELECT CASE
    WHEN p_role = 'leader'      AND r.leader_fee      IS NOT NULL THEN r.leader_fee
    WHEN p_role = 'vice_leader' AND r.vice_leader_fee IS NOT NULL THEN r.vice_leader_fee
    WHEN p_role = 'guest' AND p_gender = 'male'   THEN r.guest_fee_male
    WHEN p_role = 'guest' AND p_gender = 'female' THEN r.guest_fee_female
    ELSE (
      SELECT amount
      FROM public.fee_rule_tiers t
      WHERE t.fee_rule_id     = p_fee_rule_id
        AND t.gender          IN (p_gender, 'all')
        AND t.attendance_from <= p_season_sequence
        AND (t.attendance_to IS NULL OR t.attendance_to >= p_season_sequence)
      ORDER BY t.gender DESC
      LIMIT 1
    )
  END
  FROM public.fee_rules r
  WHERE r.id = p_fee_rule_id;
$$ LANGUAGE SQL STABLE;
