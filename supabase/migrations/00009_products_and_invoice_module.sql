
-- 1. PRODUCTS TABLE (not yet in schema)
CREATE TABLE IF NOT EXISTS public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sku         text NOT NULL,
  price       numeric(14,2) NOT NULL DEFAULT 0,
  stock       integer NOT NULL DEFAULT 0,
  category    text NOT NULL DEFAULT 'General',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_tenant_idx ON public.products(tenant_id);
DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_tenant_all ON public.products;
CREATE POLICY products_tenant_all ON public.products FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid())) WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- 2. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text,
  phone       text,
  address     text,
  notes       text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS customers_tenant_idx  ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS customers_deleted_idx ON public.customers(tenant_id, deleted_at);
DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. ENUMS
DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM (
    'draft','sent','pending_payment','partially_paid','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.stock_deduction_mode AS ENUM ('on_create','immediately','on_full_payment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash','mpesa','card','bank_transfer','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_number   text NOT NULL,
  customer_id      uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status           public.invoice_status NOT NULL DEFAULT 'draft',
  subtotal         numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount  numeric(14,2) NOT NULL DEFAULT 0,
  tax_rate         numeric(6,4) NOT NULL DEFAULT 0.16,
  tax_amount       numeric(14,2) NOT NULL DEFAULT 0,
  total            numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount      numeric(14,2) NOT NULL DEFAULT 0,
  balance_due      numeric(14,2) NOT NULL DEFAULT 0,
  notes            text,
  payment_terms    text,
  due_date         date,
  issued_at        timestamptz,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  UNIQUE(tenant_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS invoices_tenant_idx   ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS invoices_customer_idx ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx   ON public.invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON public.invoices(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS invoices_deleted_idx  ON public.invoices(tenant_id, deleted_at);
DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name         text NOT NULL,
  sku          text,
  quantity     numeric(10,2) NOT NULL DEFAULT 1,
  unit_price   numeric(14,2) NOT NULL DEFAULT 0,
  discount_pct numeric(6,4) NOT NULL DEFAULT 0,
  line_total   numeric(14,2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON public.invoice_items(invoice_id);

-- 6. INVOICE PAYMENTS
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount      numeric(14,2) NOT NULL,
  method      public.payment_method NOT NULL DEFAULT 'cash',
  reference   text,
  notes       text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at     timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS invoice_payments_tenant_idx  ON public.invoice_payments(tenant_id);

-- 7. INVOICE SETTINGS
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  stock_deduction_mode  public.stock_deduction_mode NOT NULL DEFAULT 'immediately',
  default_tax_rate      numeric(6,4) NOT NULL DEFAULT 0.16,
  default_payment_terms text NOT NULL DEFAULT 'Payment due within 30 days',
  next_invoice_seq      bigint NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS invoice_settings_updated_at ON public.invoice_settings;
CREATE TRIGGER invoice_settings_updated_at BEFORE UPDATE ON public.invoice_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. SALES TABLE (for invoice→sale integration)
CREATE TABLE IF NOT EXISTS public.sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id     uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  total          numeric(14,2) NOT NULL,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_tenant_idx  ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS sales_invoice_idx ON public.sales(invoice_id);

-- 9. INVOICE NUMBER GENERATOR
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_tenant_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seq bigint; v_date text; BEGIN
  INSERT INTO public.invoice_settings (tenant_id) VALUES (p_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
  UPDATE public.invoice_settings SET next_invoice_seq = next_invoice_seq + 1
   WHERE tenant_id = p_tenant_id RETURNING next_invoice_seq - 1 INTO v_seq;
  v_date := to_char(now() AT TIME ZONE 'Africa/Nairobi', 'YYYYMMDD');
  RETURN 'INV-' || v_date || '-' || lpad(v_seq::text, 6, '0');
END; $$;

-- 10. SYNC STATUS AFTER PAYMENT
CREATE OR REPLACE FUNCTION public.sync_invoice_after_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paid numeric(14,2); v_total numeric(14,2); v_due date;
        v_new_status public.invoice_status; BEGIN
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.invoice_payments
   WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT total, due_date INTO v_total, v_due FROM public.invoices
   WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF v_paid = 0 THEN
    v_new_status := 'pending_payment';
    IF v_due IS NOT NULL AND v_due < CURRENT_DATE THEN v_new_status := 'overdue'; END IF;
  ELSIF v_paid < v_total THEN v_new_status := 'partially_paid';
  ELSE v_new_status := 'paid'; END IF;
  UPDATE public.invoices SET paid_amount=v_paid, balance_due=GREATEST(v_total-v_paid,0),
    status=v_new_status, updated_at=now()
  WHERE id=COALESCE(NEW.invoice_id,OLD.invoice_id) AND status NOT IN ('cancelled','draft');
  RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_sync_invoice_after_payment ON public.invoice_payments;
CREATE TRIGGER trg_sync_invoice_after_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_after_payment();

-- 11. RLS
ALTER TABLE public.customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales            ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_select ON public.customers;
DROP POLICY IF EXISTS customers_insert ON public.customers;
DROP POLICY IF EXISTS customers_update ON public.customers;
DROP POLICY IF EXISTS customers_delete ON public.customers;
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) AND deleted_at IS NULL);
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid())) WITH CHECK (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) IN ('owner','superadmin'));

DROP POLICY IF EXISTS invoices_select ON public.invoices;
DROP POLICY IF EXISTS invoices_insert ON public.invoices;
DROP POLICY IF EXISTS invoices_update ON public.invoices;
DROP POLICY IF EXISTS invoices_delete ON public.invoices;
CREATE POLICY invoices_select ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) AND deleted_at IS NULL);
CREATE POLICY invoices_insert ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) IN ('owner','superadmin'));
CREATE POLICY invoices_update ON public.invoices FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid())) WITH CHECK (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY invoices_delete ON public.invoices FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) IN ('owner','superadmin'));

DROP POLICY IF EXISTS invoice_items_select ON public.invoice_items;
DROP POLICY IF EXISTS invoice_items_insert ON public.invoice_items;
DROP POLICY IF EXISTS invoice_items_update ON public.invoice_items;
DROP POLICY IF EXISTS invoice_items_delete ON public.invoice_items;
CREATE POLICY invoice_items_select ON public.invoice_items FOR SELECT TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE tenant_id = get_user_tenant(auth.uid()) AND deleted_at IS NULL));
CREATE POLICY invoice_items_insert ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (invoice_id IN (SELECT id FROM public.invoices WHERE tenant_id = get_user_tenant(auth.uid())));
CREATE POLICY invoice_items_update ON public.invoice_items FOR UPDATE TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE tenant_id = get_user_tenant(auth.uid())));
CREATE POLICY invoice_items_delete ON public.invoice_items FOR DELETE TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE tenant_id = get_user_tenant(auth.uid())));

DROP POLICY IF EXISTS invoice_payments_select ON public.invoice_payments;
DROP POLICY IF EXISTS invoice_payments_insert ON public.invoice_payments;
DROP POLICY IF EXISTS invoice_payments_delete ON public.invoice_payments;
CREATE POLICY invoice_payments_select ON public.invoice_payments FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY invoice_payments_insert ON public.invoice_payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY invoice_payments_delete ON public.invoice_payments FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) IN ('owner','superadmin'));

DROP POLICY IF EXISTS invoice_settings_select ON public.invoice_settings;
DROP POLICY IF EXISTS invoice_settings_all    ON public.invoice_settings;
CREATE POLICY invoice_settings_select ON public.invoice_settings FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));
CREATE POLICY invoice_settings_all ON public.invoice_settings FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) IN ('owner','superadmin'))
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) IN ('owner','superadmin'));

DROP POLICY IF EXISTS sales_tenant_all ON public.sales;
CREATE POLICY sales_tenant_all ON public.sales FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid())) WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

SELECT 'Migration complete' AS result;
