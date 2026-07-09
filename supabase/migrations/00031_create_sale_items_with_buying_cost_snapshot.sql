
-- Create sale_items table using buying_cost_snapshot (NOT cost_price).
-- Columns match exactly what POSScreen inserts after the cost_price fix.

CREATE TABLE IF NOT EXISTS public.sale_items (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id              uuid        NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id           uuid        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name         text        NOT NULL,
  quantity             numeric(12,3) NOT NULL DEFAULT 1,
  unit_price           numeric(12,2) NOT NULL DEFAULT 0,
  buying_cost_snapshot numeric(12,2) NOT NULL DEFAULT 0,  -- product.cost_price at sale time
  discount_amount      numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount           numeric(12,2) NOT NULL DEFAULT 0,
  subtotal             numeric(12,2) NOT NULL DEFAULT 0,  -- revenue per line
  cogs_amount          numeric(12,2) NOT NULL DEFAULT 0,  -- buying_cost_snapshot * quantity
  profit_amount        numeric(12,2) NOT NULL DEFAULT 0,  -- subtotal - cogs_amount
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id    ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- RLS
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_view_sale_items"   ON public.sale_items;
DROP POLICY IF EXISTS "cashier_insert_sale_item" ON public.sale_items;

CREATE POLICY "tenant_view_sale_items"
  ON public.sale_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id AND s.tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  ));

CREATE POLICY "cashier_insert_sale_item"
  ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id AND s.tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  ));
