
-- Add POS-required columns to existing products table.
-- cost_price is on products (buying cost) — referenced as buying_cost_snapshot in sale_items.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode        text,
  ADD COLUMN IF NOT EXISTS cost_price     numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate       numeric(5,4)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit           text          NOT NULL DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS category_id   uuid,
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS is_active     boolean       NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_available  boolean       NOT NULL DEFAULT true;
