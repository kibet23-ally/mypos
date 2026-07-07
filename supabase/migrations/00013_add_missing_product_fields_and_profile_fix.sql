
-- ── Products: add missing columns used by the Excel import ──────────────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode    text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit       text NOT NULL DEFAULT 'pc';

-- ── Products: unique constraint on (tenant_id, sku) — prevents duplicate SKUs per business ──
DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_tenant_sku_unique UNIQUE (tenant_id, sku);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ── Profiles: add full_name column so the register-user function can store the
--   person's real name separately from the display_name field.
--   Both columns exist now; AuthContext will prefer full_name, fall back to display_name.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- ── Sales: add subtotal column so we can store pre-tax amount separately ────
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);

-- ── Indexes: speed up the most common query patterns ────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_tenant_created   ON public.sales(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_created  ON public.sales(cashier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_tenant        ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role   ON public.profiles(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_categories_tenant      ON public.categories(tenant_id);

-- ── RLS: allow cashiers to insert sales (INSERT policy needs WITH CHECK) ─────
DROP POLICY IF EXISTS "tenant_insert_sales" ON public.sales;
CREATE POLICY "tenant_insert_sales" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- ── RLS: allow owner/cashier to update products (stock decrement) ────────────
DROP POLICY IF EXISTS "cashier_update_products" ON public.products;
CREATE POLICY "cashier_update_products" ON public.products
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));
