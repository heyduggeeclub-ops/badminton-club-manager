-- ============================================================
-- Migration 006: 新增 prizes 支出類型
-- ============================================================

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS chk_expenses_category;

ALTER TABLE public.expenses
  ADD CONSTRAINT chk_expenses_category
  CHECK (category IN ('venue_rental', 'shuttlecock', 'drinks', 'prizes', 'other'));
