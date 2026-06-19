-- Allow activity_date to be NULL so duplicated activities can be saved without a date
ALTER TABLE public.activities ALTER COLUMN activity_date DROP NOT NULL;
