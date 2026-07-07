-- ══════════════════════════════════════════════════════════════════════
-- 00008 — Full POS Schema
-- Adds: missing enums, columns on existing tables, all POS tables,
--       helper functions, triggers, RLS, realtime, business templates
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Enums ──────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE public.payment_method    AS ENUM ('cash','mpesa','card','bank_transfer','other');       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sale_status       AS ENUM ('completed','refunded','voided','pending');           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.stock_movement_type AS ENUM ('sale','purchase','adjustment','transfer','return','waste'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Patch tenants table ────────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS currency_code   text NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS currency_symbol text NOT NULL DEFAULT 'KSh',
  ADD COLUMN IF NOT EXISTS currency_name   text NOT NULL DEFAULT 'Kenyan Shilling';

-- ── 3. Patch profiles table ───────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id uuid;

-- ── 4. branches ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  address    text,
  phone      text,
  email      text,
  is_main    boolean NOT NULL DEFAULT false,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON public.branches(tenant_id);

-- ── 5. categories ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name        text NOT NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories(tenant_id);

-- ── 6. products ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id    uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category_id  uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name         text NOT NULL,
  description  text,
  sku          text,
  barcode      text,
  price        numeric(12,2) NOT NULL DEFAULT 0,
  cost_price   numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate     numeric(5,2)  NOT NULL DEFAULT 0,
  unit         text NOT NULL DEFAULT 'pcs',
  image_url    text,
  is_active    boolean NOT NULL DEFAULT true,
  is_available boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_products_tenant    ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category  ON public.products(category_id);

-- ── 7. inventory ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id        uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  product_id       uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_on_hand numeric(12,3) NOT NULL DEFAULT 0,
  reorder_level    numeric(12,3) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, product_id, branch_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant  ON public.inventory(tenant_id);

-- ── 8. customers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name             text NOT NULL,
  email            text,
  phone            text,
  address          text,
  total_purchases  integer NOT NULL DEFAULT 0,
  total_spent      numeric(12,2) NOT NULL DEFAULT 0,
  last_purchase_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);

-- ── 9. sales ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  cashier_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  customer_id     uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  receipt_number  text NOT NULL,
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount    numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid     numeric(12,2) NOT NULL DEFAULT 0,
  change_due      numeric(12,2) NOT NULL DEFAULT 0,
  payment_method  public.payment_method NOT NULL DEFAULT 'cash',
  status          public.sale_status    NOT NULL DEFAULT 'completed',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, receipt_number)
);
CREATE INDEX IF NOT EXISTS idx_sales_tenant    ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier   ON public.sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_created   ON public.sales(created_at DESC);

-- ── 10. sale_items ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sale_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name    text NOT NULL,
  quantity        numeric(12,3) NOT NULL DEFAULT 1,
  unit_price      numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

-- ── 11. stock_movements ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  movement_type public.stock_movement_type NOT NULL,
  quantity      numeric(12,3) NOT NULL,
  note          text,
  reference_id  uuid,
  performed_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant  ON public.stock_movements(tenant_id);

-- ── 12. business_templates ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_templates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type      text NOT NULL UNIQUE,
  display_name       text NOT NULL,
  icon               text NOT NULL DEFAULT 'Store',
  description        text NOT NULL DEFAULT '',
  default_categories jsonb NOT NULL DEFAULT '[]',
  default_products   jsonb NOT NULL DEFAULT '[]',
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ── 13. template_seeding_log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.template_seeding_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.business_templates(id) ON DELETE SET NULL,
  seeded_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 14. updated_at triggers ───────────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER branches_updated_at      BEFORE UPDATE ON public.branches      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER categories_updated_at   BEFORE UPDATE ON public.categories    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER products_updated_at     BEFORE UPDATE ON public.products      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER inventory_updated_at    BEFORE UPDATE ON public.inventory     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER customers_updated_at    BEFORE UPDATE ON public.customers     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER sales_updated_at        BEFORE UPDATE ON public.sales         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 15. Helper functions ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_cached(uid uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION public.get_superadmin_count()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM public.profiles WHERE role = 'superadmin';
$$;

-- Receipt number generator
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_tenant_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  seq_val bigint;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_val FROM public.sales WHERE tenant_id = p_tenant_id;
  RETURN 'RCP-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(seq_val::text, 4, '0');
END;
$$;

-- ── 16. RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.branches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_seeding_log ENABLE ROW LEVEL SECURITY;

-- branches
CREATE POLICY "superadmin_full_branches" ON public.branches FOR ALL TO authenticated USING (is_superadmin());
CREATE POLICY "tenant_view_branches"     ON public.branches FOR SELECT TO authenticated USING (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY "owner_manage_branches"    ON public.branches FOR ALL TO authenticated USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) = 'owner');

-- categories
CREATE POLICY "superadmin_full_categories" ON public.categories FOR ALL TO authenticated USING (is_superadmin());
CREATE POLICY "tenant_view_categories"     ON public.categories FOR SELECT TO authenticated USING (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY "owner_manage_categories"    ON public.categories FOR ALL TO authenticated USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) = 'owner');

-- products
CREATE POLICY "superadmin_full_products" ON public.products FOR ALL TO authenticated USING (is_superadmin());
CREATE POLICY "tenant_view_products"     ON public.products FOR SELECT TO authenticated USING (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY "owner_manage_products"    ON public.products FOR ALL TO authenticated USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) = 'owner');

-- inventory
CREATE POLICY "superadmin_full_inventory" ON public.inventory FOR ALL TO authenticated USING (is_superadmin());
CREATE POLICY "tenant_view_inventory"     ON public.inventory FOR SELECT TO authenticated USING (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY "owner_manage_inventory"    ON public.inventory FOR ALL TO authenticated USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) = 'owner');
CREATE POLICY "cashier_update_inventory"  ON public.inventory FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) = 'cashier');

-- customers
CREATE POLICY "superadmin_full_customers" ON public.customers FOR ALL TO authenticated USING (is_superadmin());
CREATE POLICY "tenant_manage_customers"   ON public.customers FOR ALL TO authenticated USING (tenant_id = get_user_tenant(auth.uid()));

-- sales
CREATE POLICY "superadmin_full_sales"  ON public.sales FOR ALL TO authenticated USING (is_superadmin());
CREATE POLICY "tenant_view_sales"      ON public.sales FOR SELECT TO authenticated USING (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY "cashier_insert_sale"    ON public.sales FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant(auth.uid()) AND cashier_id = auth.uid());
CREATE POLICY "owner_manage_sales"     ON public.sales FOR ALL TO authenticated USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) = 'owner');

-- sale_items (via sale tenant check)
CREATE POLICY "tenant_view_sale_items"   ON public.sale_items FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.tenant_id = get_user_tenant(auth.uid())));
CREATE POLICY "cashier_insert_sale_item" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.tenant_id = get_user_tenant(auth.uid())));
CREATE POLICY "superadmin_full_sale_items" ON public.sale_items FOR ALL TO authenticated USING (is_superadmin());

-- stock_movements
CREATE POLICY "superadmin_full_movements" ON public.stock_movements FOR ALL TO authenticated USING (is_superadmin());
CREATE POLICY "tenant_view_movements"     ON public.stock_movements FOR SELECT TO authenticated USING (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY "tenant_insert_movement"    ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- business_templates (public read)
CREATE POLICY "anyone_view_templates" ON public.business_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "superadmin_manage_templates" ON public.business_templates FOR ALL TO authenticated USING (is_superadmin());

-- template_seeding_log
CREATE POLICY "superadmin_full_seeding_log" ON public.template_seeding_log FOR ALL TO authenticated USING (is_superadmin());
CREATE POLICY "tenant_view_own_seeding_log" ON public.template_seeding_log FOR SELECT TO authenticated USING (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY "service_insert_seeding_log"  ON public.template_seeding_log FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- ── 17. Realtime ─────────────────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;      EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements; EXCEPTION WHEN others THEN NULL; END $$;

-- ── 18. Seed business templates ───────────────────────────────────────
INSERT INTO public.business_templates (business_type, display_name, icon, description, default_categories, default_products) VALUES
('supermarket','Supermarket','ShoppingCart','Full grocery & retail store',
  '[{"name":"Fresh Produce","sort_order":1},{"name":"Dairy & Eggs","sort_order":2},{"name":"Beverages","sort_order":3},{"name":"Bakery","sort_order":4},{"name":"Snacks","sort_order":5},{"name":"Household","sort_order":6}]'::jsonb,
  '[{"name":"Fresh Tomatoes","sku":"VEG-001","price":50,"cost_price":30,"unit":"kg","category":"Fresh Produce"},{"name":"Whole Milk 1L","sku":"DAI-001","price":120,"cost_price":90,"unit":"pcs","category":"Dairy & Eggs"},{"name":"Mineral Water 500ml","sku":"BEV-001","price":50,"cost_price":30,"unit":"pcs","category":"Beverages"},{"name":"White Bread Loaf","sku":"BAK-001","price":65,"cost_price":45,"unit":"pcs","category":"Bakery"}]'::jsonb),

('restaurant','Restaurant','UtensilsCrossed','Dine-in, takeout & delivery',
  '[{"name":"Starters","sort_order":1},{"name":"Main Course","sort_order":2},{"name":"Drinks","sort_order":3},{"name":"Desserts","sort_order":4},{"name":"Sides","sort_order":5},{"name":"Special","sort_order":6}]'::jsonb,
  '[{"name":"Samosa (3 pcs)","sku":"STR-001","price":150,"cost_price":60,"unit":"plate","category":"Starters"},{"name":"Beef Stew & Rice","sku":"MC-001","price":350,"cost_price":180,"unit":"plate","category":"Main Course"},{"name":"Soda 300ml","sku":"DRK-001","price":80,"cost_price":50,"unit":"pcs","category":"Drinks"},{"name":"Chapati","sku":"SDE-001","price":30,"cost_price":15,"unit":"pcs","category":"Sides"}]'::jsonb),

('clothing','Clothing Store','Shirt','Fashion, apparel & accessories',
  '[{"name":"Mens Wear","sort_order":1},{"name":"Ladies Wear","sort_order":2},{"name":"Kids Wear","sort_order":3},{"name":"Footwear","sort_order":4},{"name":"Accessories","sort_order":5},{"name":"Sportswear","sort_order":6}]'::jsonb,
  '[{"name":"Mens T-Shirt","sku":"MW-001","price":800,"cost_price":400,"unit":"pcs","category":"Mens Wear"},{"name":"Ladies Dress","sku":"LW-001","price":1500,"cost_price":800,"unit":"pcs","category":"Ladies Wear"},{"name":"Kids Shorts","sku":"KW-001","price":450,"cost_price":200,"unit":"pcs","category":"Kids Wear"},{"name":"Sneakers","sku":"FW-001","price":2500,"cost_price":1500,"unit":"pair","category":"Footwear"}]'::jsonb),

('pharmacy','Pharmacy','Pill','Drugs, healthcare & wellness',
  '[{"name":"Prescription","sort_order":1},{"name":"OTC Medicines","sort_order":2},{"name":"Supplements","sort_order":3},{"name":"Personal Care","sort_order":4},{"name":"Baby Care","sort_order":5},{"name":"Medical Devices","sort_order":6}]'::jsonb,
  '[{"name":"Paracetamol 500mg","sku":"OTC-001","price":30,"cost_price":15,"unit":"strip","category":"OTC Medicines"},{"name":"Vitamin C 1000mg","sku":"SUP-001","price":350,"cost_price":200,"unit":"bottle","category":"Supplements"},{"name":"Hand Sanitizer 250ml","sku":"PC-001","price":150,"cost_price":80,"unit":"pcs","category":"Personal Care"},{"name":"Cough Syrup 100ml","sku":"OTC-002","price":180,"cost_price":100,"unit":"bottle","category":"OTC Medicines"}]'::jsonb),

('electronics','Electronics Shop','Cpu','Gadgets, phones & accessories',
  '[{"name":"Phones","sort_order":1},{"name":"Laptops","sort_order":2},{"name":"Accessories","sort_order":3},{"name":"Audio","sort_order":4},{"name":"TV & Display","sort_order":5},{"name":"Appliances","sort_order":6}]'::jsonb,
  '[{"name":"USB-C Cable 1m","sku":"ACC-001","price":250,"cost_price":100,"unit":"pcs","category":"Accessories"},{"name":"Phone Screen Guard","sku":"ACC-002","price":150,"cost_price":50,"unit":"pcs","category":"Accessories"},{"name":"Earphones Wired","sku":"AUD-001","price":500,"cost_price":250,"unit":"pcs","category":"Audio"},{"name":"Phone Charger 20W","sku":"ACC-003","price":800,"cost_price":400,"unit":"pcs","category":"Accessories"}]'::jsonb),

('salon','Salon & Spa','Scissors','Hair, beauty & grooming services',
  '[{"name":"Hair Services","sort_order":1},{"name":"Nail Services","sort_order":2},{"name":"Skin Care","sort_order":3},{"name":"Hair Products","sort_order":4},{"name":"Beauty Products","sort_order":5},{"name":"Packages","sort_order":6}]'::jsonb,
  '[{"name":"Ladies Haircut","sku":"HS-001","price":500,"cost_price":100,"unit":"service","category":"Hair Services"},{"name":"Mens Haircut","sku":"HS-002","price":200,"cost_price":50,"unit":"service","category":"Hair Services"},{"name":"Manicure","sku":"NS-001","price":400,"cost_price":80,"unit":"service","category":"Nail Services"},{"name":"Hair Relaxer","sku":"HP-001","price":1200,"cost_price":500,"unit":"service","category":"Hair Services"}]'::jsonb),

('general','General Store','Store','Multi-purpose retail business',
  '[{"name":"Food & Drinks","sort_order":1},{"name":"Stationery","sort_order":2},{"name":"Toiletries","sort_order":3},{"name":"Electronics","sort_order":4},{"name":"Clothing","sort_order":5},{"name":"Other","sort_order":6}]'::jsonb,
  '[{"name":"Soda 300ml","sku":"GS-001","price":80,"cost_price":50,"unit":"pcs","category":"Food & Drinks"},{"name":"Exercise Book","sku":"GS-002","price":45,"cost_price":25,"unit":"pcs","category":"Stationery"},{"name":"Bar Soap 175g","sku":"GS-003","price":60,"cost_price":35,"unit":"pcs","category":"Toiletries"},{"name":"AA Batteries (2pk)","sku":"GS-004","price":100,"cost_price":55,"unit":"pcs","category":"Electronics"}]'::jsonb)

ON CONFLICT (business_type) DO UPDATE SET
  display_name       = EXCLUDED.display_name,
  icon               = EXCLUDED.icon,
  description        = EXCLUDED.description,
  default_categories = EXCLUDED.default_categories,
  default_products   = EXCLUDED.default_products;

SELECT 'Schema 00008 applied — ' || COUNT(*) || ' templates seeded' AS status FROM public.business_templates;
