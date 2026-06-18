-- ============================================================
-- 008_audit_logs_policy.sql
-- 修正：audit_logs 原本只有 SELECT policy，缺少 INSERT policy
-- 導致 server action 寫入審計記錄時被 RLS 靜默擋掉
-- ============================================================

-- 新增 INSERT policy：leader / vice_leader 可寫入操作紀錄
CREATE POLICY admin_insert ON public.audit_logs
  FOR INSERT WITH CHECK (public.get_current_member_role() IN ('leader', 'vice_leader'));
