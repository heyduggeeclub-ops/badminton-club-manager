-- ============================================================
-- 003_payment_type.sql — payment_transactions 補繳類型欄位
-- 用途：區分正常收款與事後補繳，方便財務稽核
-- ============================================================

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'payment';

ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS chk_tx_type;

ALTER TABLE public.payment_transactions
  ADD CONSTRAINT chk_tx_type
  CHECK (type IN ('payment', 'debt_repayment'));

COMMENT ON COLUMN public.payment_transactions.type IS
  'payment = 當場收費；debt_repayment = 事後補繳舊欠款';
