-- ============================================================
-- 010a_bootstrap_now.sql
-- 立即解鎖：在 Supabase SQL Editor 執行此檔案
-- （SQL Editor 以 postgres 執行，直接繞過 RLS）
--
-- 步驟：
--   1. 到 Supabase Dashboard → SQL Editor
--   2. 貼上以下 SQL，修改 name / gender 後執行
--   3. 之後就可以從 UI 正常新增其他會員
-- ============================================================

-- 插入管理員會員（以 auth.users 的 email 查找對應的 user_id）
INSERT INTO public.members (user_id, name, gender, role, status)
SELECT
  id                  AS user_id,
  '團長姓名'           AS name,      -- ← 改成你的名字
  'male'::gender_type  AS gender,    -- ← 'male' 或 'female'
  'leader'::member_role AS role,
  'active'::member_status AS status
FROM auth.users
WHERE email = 'pizzah3365@gmail.com'  -- ← 你的登入 Email（已預填）
LIMIT 1
ON CONFLICT DO NOTHING;

-- 確認是否成功
SELECT id, name, gender, role, status, user_id FROM public.members;
