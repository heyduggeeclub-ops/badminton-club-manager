-- ============================================================
-- Migration 005: 會員停用資訊欄位
-- 新增 deactivated_at、deactivation_reason
-- ============================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS deactivated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;
