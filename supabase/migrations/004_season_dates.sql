-- ============================================================
-- 004_season_dates.sql — 季度日期可配置化 + 6月併入 Q3
-- 背景：試辦期（6月）直接併入 Q3，避免跨兩個季度統計混亂
-- ============================================================

DO $$
DECLARE
  q2_id UUID;
  q3_id UUID;
BEGIN
  SELECT id INTO q2_id FROM public.seasons WHERE year = 2026 AND quarter = 2;
  SELECT id INTO q3_id FROM public.seasons WHERE year = 2026 AND quarter = 3;

  IF q2_id IS NULL OR q3_id IS NULL THEN
    RAISE NOTICE '2026 Q2 或 Q3 季度資料不存在，略過更新';
    RETURN;
  END IF;

  -- ── Step 1: 更新季度日期 ──────────────────────────────────
  -- Q2: 原 4/1–6/30 → 縮短至 4/1–5/31
  UPDATE public.seasons
  SET end_date = '2026-05-31'
  WHERE id = q2_id;

  -- Q3: 原 7/1–9/30 → 提早至 6/1–9/30
  UPDATE public.seasons
  SET start_date = '2026-06-01'
  WHERE id = q3_id;

  -- ── Step 2: 將 6月的出席紀錄改為 Q3 (先更新，再更新 activities) ──
  UPDATE public.attendance_records
  SET season_id = q3_id
  WHERE season_id = q2_id
    AND activity_id IN (
      SELECT id FROM public.activities
      WHERE season_id = q2_id
        AND activity_date >= '2026-06-01'
    );

  -- ── Step 3: 將 6月的活動改為 Q3 ──────────────────────────
  UPDATE public.activities
  SET season_id = q3_id
  WHERE season_id = q2_id
    AND activity_date >= '2026-06-01';

  RAISE NOTICE '季度更新完成：Q2 縮至 5/31，Q3 擴展至 6/1；已移轉 % 筆活動',
    (SELECT COUNT(*) FROM public.activities WHERE season_id = q3_id AND activity_date < '2026-07-01');
END $$;
