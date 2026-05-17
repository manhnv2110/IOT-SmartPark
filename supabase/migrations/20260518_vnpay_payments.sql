-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Switch payment provider từ SePay sang VNPay sandbox.
-- Chạy trong Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Thêm column generic `provider_tx_id` (UNIQUE) cho VNPay txnRef / bank tx code.
--    Giữ lại `sepay_tx_id` để không phá data lịch sử nhưng KHÔNG dùng tiếp.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_tx_id text;

-- 2. Backfill cho row cũ (nếu có): copy sepay_tx_id → provider_tx_id.
UPDATE public.payments
   SET provider_tx_id = sepay_tx_id
 WHERE provider_tx_id IS NULL
   AND sepay_tx_id IS NOT NULL;

-- 3. Default provider = 'vnpay' cho row mới.
ALTER TABLE public.payments
  ALTER COLUMN provider SET DEFAULT 'vnpay';

-- 4. UNIQUE constraint trên (provider, provider_tx_id) — chống xử lý trùng IPN.
--    Một sandbox txn của VNPay có thể có cùng id với prod, nên scope theo provider.
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_tx_id_key
  ON public.payments (provider, provider_tx_id)
  WHERE provider_tx_id IS NOT NULL;

-- 5. Drop unique cũ trên sepay_tx_id (nếu nó từng tạo) — tránh conflict khi
--    insert nhiều row VNPay với sepay_tx_id = NULL.
--    Postgres cho phép nhiều NULL trong UNIQUE, nên thực ra không cần drop,
--    nhưng để rõ ràng:
-- DROP INDEX IF EXISTS payments_sepay_tx_id_key;

-- 6. Comment để rõ ý đồ.
COMMENT ON COLUMN public.payments.provider_tx_id
  IS 'Mã giao dịch theo provider hiện tại. Với VNPay = vnp_TxnRef (chính là payments.id).';
COMMENT ON COLUMN public.payments.sepay_tx_id
  IS 'DEPRECATED — chỉ giữ cho data cũ. Provider mới dùng provider_tx_id.';
