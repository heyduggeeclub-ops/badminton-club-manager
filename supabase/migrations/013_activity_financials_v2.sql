-- Extend activity_financials view with:
--   start_time, end_time, court_count, max_per_court (from activities)
--   registration_count (confirmed + promoted), waitlist_count (from registrations)
-- This eliminates supplementary queries in dashboard and activities list.

-- DROP 舊 view 再重建，避免 CREATE OR REPLACE 的欄位順序限制（PG error 42P16）
DROP VIEW IF EXISTS public.activity_financials;

CREATE VIEW public.activity_financials AS
SELECT
  a.id              AS activity_id,
  a.activity_date,
  a.start_time,
  a.end_time,
  a.venue_name,
  a.court_count,
  a.max_per_court,
  a.season_id,
  a.status,
  COALESCE(income.attended_count,    0) AS attended_count,
  COALESCE(income.total_income,      0) AS total_income,
  COALESCE(exp.total_expense,        0) AS total_expense,
  COALESCE(income.total_income,      0) - COALESCE(exp.total_expense, 0) AS profit,
  COALESCE(reg.registration_count,   0) AS registration_count,
  COALESCE(reg.waitlist_count,       0) AS waitlist_count
FROM public.activities a
LEFT JOIN (
  SELECT activity_id,
         COUNT(*)    FILTER (WHERE checked_in = TRUE) AS attended_count,
         SUM(paid_amount)                             AS total_income
  FROM public.attendance_records
  GROUP BY activity_id
) income ON income.activity_id = a.id
LEFT JOIN (
  SELECT activity_id, SUM(amount) AS total_expense
  FROM public.expenses
  WHERE activity_id IS NOT NULL
  GROUP BY activity_id
) exp ON exp.activity_id = a.id
LEFT JOIN (
  SELECT activity_id,
         COUNT(*) FILTER (WHERE status IN ('confirmed', 'promoted')) AS registration_count,
         COUNT(*) FILTER (WHERE status = 'waitlist')                AS waitlist_count
  FROM public.registrations
  GROUP BY activity_id
) reg ON reg.activity_id = a.id;
