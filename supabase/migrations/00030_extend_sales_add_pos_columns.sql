
-- Extend the existing 'sales' table with all columns the POS app inserts.
-- Uses ADD COLUMN IF NOT EXISTS so it is safe to re-run.

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS branch_id        uuid,
  ADD COLUMN IF NOT EXISTS cashier_id       uuid,
  ADD COLUMN IF NOT EXISTS customer_id      uuid,
  ADD COLUMN IF NOT EXISTS receipt_number   text,
  ADD COLUMN IF NOT EXISTS subtotal         numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount       numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount  numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount     numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid      numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_due       numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS notes            text;

-- Unique constraint prevents duplicate receipt numbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_receipt_number_key'
  ) THEN
    ALTER TABLE public.sales ADD CONSTRAINT sales_receipt_number_key UNIQUE (receipt_number);
  END IF;
END$$;
