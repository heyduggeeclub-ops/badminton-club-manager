-- ============================================================
-- 011_role_based_fee.sql
-- 在 fee_rules 加入團長/副團長固定費用欄位
-- NULL = 走正常階梯；有值 = 固定金額
-- ============================================================

ALTER TABLE public.fee_rules
  ADD COLUMN IF NOT EXISTS leader_fee      INTEGER DEFAULT NULL CHECK (leader_fee >= 0),
  ADD COLUMN IF NOT EXISTS vice_leader_fee INTEGER DEFAULT NULL CHECK (vice_leader_fee >= 0);

-- 更新 get_fee_amount：加入 p_role 參數
-- 若 role 有對應固定費用 → 回傳固定金額；否則走原本階梯邏輯
CREATE OR REPLACE FUNCTION public.get_fee_amount(
  p_fee_rule_id     UUID,
  p_gender          TEXT,
  p_season_sequence INTEGER,
  p_role            TEXT DEFAULT 'member'
) RETURNS INTEGER AS $$
  SELECT CASE
    WHEN p_role = 'leader'      AND r.leader_fee      IS NOT NULL THEN r.leader_fee
    WHEN p_role = 'vice_leader' AND r.vice_leader_fee IS NOT NULL THEN r.vice_leader_fee
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
