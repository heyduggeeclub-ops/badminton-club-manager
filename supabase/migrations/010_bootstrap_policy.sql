-- ============================================================
-- 010_bootstrap_policy.sql
-- 修正 members 表 RLS 雞生蛋問題
--
-- 問題：清空 members 後，get_current_member_role() 回傳 NULL，
--       admin_all policy 擋住所有 INSERT，導致無法建立第一筆會員。
--
-- 解法：新增 policy 允許已登入用戶建立「自己的」會員資料
--       （user_id = auth.uid()），讓系統可以從零開始 bootstrap。
-- ============================================================

-- 允許已認證用戶為自己建立會員資料
-- 安全性：只能建立 user_id = 自己 uid 的記錄，無法替他人建立
CREATE POLICY authenticated_create_own_member ON public.members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );
