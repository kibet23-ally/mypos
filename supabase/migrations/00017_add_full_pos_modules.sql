
-- ═══════════════════════════════════════════════════════════════════════════
-- PosifyPro — Full Module Migration
-- Adds: quotations, invoices, invoice_payments, sales_returns, return_items,
--        stock_movements, expenses, expense_categories, receipt_settings,
--        tax_rates, purchases, purchase_items, subscription_plans, audit_logs
-- Extends: tenants, sales, products, purchase_orders, subscriptions
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extend existing tables ──────────────────────────────────────────────────

-- tenants: receipt settings & plan info
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS receipt_header text,
  ADD COLUMN IF NOT EXISTS receipt_footer text,
  ADD COLUMN IF NOT EXISTS receipt_paper_size text DEFAULT 'a4',
  ADD COLUMN IF NOT EXISTS show_qr_on_receipt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_inclusive boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS email text;

-- sales: add receipt_number, tax_amount, total_amount columns
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric GENERATED ALWAYS AS (COALESCE(subtotal,total) + COALESCE(tax_amount,0) - COALESCE(discount,0)) STORED;

-- products: add reorder_level, last_purchase_cost
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_purchase_cost numeric,
  ADD COLUMN IF NOT EXISTS average_cost numeric;

-- purchase_orders: extend with full workflow
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS po_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_date date,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ─── Auto-number trigger for purchase_orders ────────────────────────────────
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number,'PO-',2) AS integer)),0)+1
    INTO v_num FROM purchase_orders WHERE tenant_id = NEW.tenant_id AND order_number IS NOT NULL;
  NEW.order_number := 'PO-' || LPAD(v_num::text,5,'0');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_po_number ON purchase_orders;
CREATE TRIGGER trg_po_number BEFORE INSERT ON purchase_orders
  FOR EACH ROW WHEN (NEW.order_number IS NULL) EXECUTE FUNCTION generate_po_number();

-- ─── Quotations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_number  text NOT NULL,
  customer_id   uuid REFERENCES customers(id),
  customer_name text,
  items         jsonb NOT NULL DEFAULT '[]',
  subtotal      numeric NOT NULL DEFAULT 0,
  discount      numeric NOT NULL DEFAULT 0,
  tax_amount    numeric NOT NULL DEFAULT 0,
  total         numeric NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'draft', -- draft | sent | accepted | rejected | expired | converted
  valid_until   date,
  notes         text,
  terms         text,
  created_by    uuid REFERENCES profiles(id),
  converted_to_invoice_id uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS quotations_number_tenant ON quotations(tenant_id, quote_number);

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(quote_number,'QT-',2) AS integer)),0)+1
    INTO v_num FROM quotations WHERE tenant_id = NEW.tenant_id AND quote_number LIKE 'QT-%';
  NEW.quote_number := 'QT-' || LPAD(v_num::text,5,'0');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_quote_number ON quotations;
CREATE TRIGGER trg_quote_number BEFORE INSERT ON quotations
  FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

-- ─── Invoices ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id    uuid REFERENCES customers(id),
  customer_name  text,
  sale_id        uuid REFERENCES sales(id),
  quotation_id   uuid REFERENCES quotations(id),
  items          jsonb NOT NULL DEFAULT '[]',
  subtotal       numeric NOT NULL DEFAULT 0,
  discount       numeric NOT NULL DEFAULT 0,
  tax_amount     numeric NOT NULL DEFAULT 0,
  total          numeric NOT NULL DEFAULT 0,
  amount_paid    numeric NOT NULL DEFAULT 0,
  balance_due    numeric GENERATED ALWAYS AS (total - amount_paid) STORED,
  status         text NOT NULL DEFAULT 'unpaid', -- unpaid | partial | paid | overdue | void
  due_date       date,
  notes          text,
  terms          text,
  created_by     uuid REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_number_tenant ON invoices(tenant_id, invoice_number);

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number,'INV-',2) AS integer)),0)+1
    INTO v_num FROM invoices WHERE tenant_id = NEW.tenant_id AND invoice_number LIKE 'INV-%';
  NEW.invoice_number := 'INV-' || LPAD(v_num::text,5,'0');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_invoice_number ON invoices;
CREATE TRIGGER trg_invoice_number BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Invoice payments (partial / multiple methods)
CREATE TABLE IF NOT EXISTS invoice_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount         numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash',
  reference      text,
  notes          text,
  paid_at        timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES profiles(id)
);

-- Trigger: update invoice amount_paid + status after each payment insert/delete
CREATE OR REPLACE FUNCTION sync_invoice_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_tid uuid; v_total numeric; v_paid numeric;
BEGIN
  v_tid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT total, COALESCE((SELECT SUM(amount) FROM invoice_payments WHERE invoice_id = v_tid),0)
    INTO v_total, v_paid FROM invoices WHERE id = v_tid;
  UPDATE invoices SET
    amount_paid = v_paid,
    status = CASE WHEN v_paid <= 0 THEN 'unpaid'
                  WHEN v_paid < v_total THEN 'partial'
                  ELSE 'paid' END,
    updated_at = now()
  WHERE id = v_tid;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_invoice_payment ON invoice_payments;
CREATE TRIGGER trg_invoice_payment AFTER INSERT OR DELETE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment();

-- ─── Sales Returns ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_returns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  return_number  text NOT NULL,
  sale_id        uuid REFERENCES sales(id),
  invoice_id     uuid REFERENCES invoices(id),
  customer_id    uuid REFERENCES customers(id),
  return_type    text NOT NULL DEFAULT 'refund', -- refund | exchange | store_credit
  items          jsonb NOT NULL DEFAULT '[]',
  subtotal       numeric NOT NULL DEFAULT 0,
  tax_amount     numeric NOT NULL DEFAULT 0,
  total          numeric NOT NULL DEFAULT 0,
  refund_method  text DEFAULT 'cash',
  reason         text,
  notes          text,
  status         text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | completed
  approved_by    uuid REFERENCES profiles(id),
  approved_at    timestamptz,
  created_by     uuid REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(return_number,'RTN-',2) AS integer)),0)+1
    INTO v_num FROM sales_returns WHERE tenant_id = NEW.tenant_id AND return_number LIKE 'RTN-%';
  NEW.return_number := 'RTN-' || LPAD(v_num::text,5,'0');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_return_number ON sales_returns;
CREATE TRIGGER trg_return_number BEFORE INSERT ON sales_returns
  FOR EACH ROW EXECUTE FUNCTION generate_return_number();

-- ─── Stock Movements (inventory ledger) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type  text NOT NULL, -- sale | purchase | return | adjustment | opening | transfer | damage
  quantity       integer NOT NULL,  -- positive = in, negative = out
  balance_after  integer NOT NULL DEFAULT 0,
  unit_cost      numeric,
  reference_id   uuid,   -- sale_id / purchase_id / return_id
  reference_type text,   -- 'sale' | 'purchase' | 'return' | 'adjustment'
  notes          text,
  created_by     uuid REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_tenant  ON stock_movements(tenant_id, created_at DESC);

-- ─── Expense Categories ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS expense_cats_name ON expense_categories(tenant_id, name);

-- Seed default categories via function (called per-tenant on first expense)
INSERT INTO expense_categories(tenant_id, name, color)
  SELECT id,'Rent','#3b82f6' FROM tenants ON CONFLICT DO NOTHING;
INSERT INTO expense_categories(tenant_id, name, color)
  SELECT id,'Salaries','#10b981' FROM tenants ON CONFLICT DO NOTHING;
INSERT INTO expense_categories(tenant_id, name, color)
  SELECT id,'Utilities','#f59e0b' FROM tenants ON CONFLICT DO NOTHING;
INSERT INTO expense_categories(tenant_id, name, color)
  SELECT id,'Marketing','#8b5cf6' FROM tenants ON CONFLICT DO NOTHING;
INSERT INTO expense_categories(tenant_id, name, color)
  SELECT id,'Supplies','#ef4444' FROM tenants ON CONFLICT DO NOTHING;
INSERT INTO expense_categories(tenant_id, name, color)
  SELECT id,'Transport','#06b6d4' FROM tenants ON CONFLICT DO NOTHING;
INSERT INTO expense_categories(tenant_id, name, color)
  SELECT id,'Maintenance','#84cc16' FROM tenants ON CONFLICT DO NOTHING;
INSERT INTO expense_categories(tenant_id, name, color)
  SELECT id,'Other','#94a3b8' FROM tenants ON CONFLICT DO NOTHING;

-- ─── Expenses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES expense_categories(id),
  category_name   text,
  title           text NOT NULL,
  amount          numeric NOT NULL DEFAULT 0,
  tax_amount      numeric NOT NULL DEFAULT 0,
  total_amount    numeric GENERATED ALWAYS AS (amount + tax_amount) STORED,
  payment_method  text DEFAULT 'cash',
  reference       text,
  receipt_url     text,
  expense_date    date NOT NULL DEFAULT CURRENT_DATE,
  is_recurring    boolean DEFAULT false,
  recur_frequency text,   -- monthly | weekly | yearly
  recur_next_date date,
  status          text DEFAULT 'approved', -- pending | approved | rejected
  approved_by     uuid REFERENCES profiles(id),
  notes           text,
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_tenant_date ON expenses(tenant_id, expense_date DESC);

-- ─── Tax Rates (per-tenant multiple tax rates) ───────────────────────────────
CREATE TABLE IF NOT EXISTS tax_rates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  rate        numeric NOT NULL DEFAULT 0,
  is_default  boolean DEFAULT false,
  applies_to  text DEFAULT 'all', -- all | products | services
  is_active   boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tax_rates_name ON tax_rates(tenant_id, name);

-- Seed VAT for each tenant
INSERT INTO tax_rates(tenant_id, name, rate, is_default)
  SELECT id, 'VAT (16%)', 16, true FROM tenants ON CONFLICT DO NOTHING;

-- ─── Purchases (stock received from suppliers) ───────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_number text NOT NULL,
  supplier_id     uuid REFERENCES suppliers(id),
  supplier_name   text,
  items           jsonb NOT NULL DEFAULT '[]',
  subtotal        numeric NOT NULL DEFAULT 0,
  discount        numeric NOT NULL DEFAULT 0,
  tax_amount      numeric NOT NULL DEFAULT 0,
  total           numeric NOT NULL DEFAULT 0,
  amount_paid     numeric NOT NULL DEFAULT 0,
  payment_method  text DEFAULT 'cash',
  purchase_date   date NOT NULL DEFAULT CURRENT_DATE,
  reference       text,
  notes           text,
  status          text NOT NULL DEFAULT 'received', -- draft | ordered | received | partial | cancelled
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(purchase_number,'PUR-',2) AS integer)),0)+1
    INTO v_num FROM purchases WHERE tenant_id = NEW.tenant_id AND purchase_number LIKE 'PUR-%';
  NEW.purchase_number := 'PUR-' || LPAD(v_num::text,5,'0');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_number ON purchases;
CREATE TRIGGER trg_purchase_number BEFORE INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION generate_purchase_number();

-- ─── Subscription Plans (SA-managed plans) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  price        numeric NOT NULL DEFAULT 0,
  currency     text NOT NULL DEFAULT 'KES',
  interval     text NOT NULL DEFAULT 'monthly', -- monthly | yearly
  max_users    integer DEFAULT 5,
  max_products integer DEFAULT 1000,
  features     jsonb DEFAULT '[]',
  is_active    boolean DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO subscription_plans(name,price,currency,interval,max_users,max_products,features) VALUES
  ('Starter', 999,  'KES','monthly',3, 500, '["POS","Products","Customers","Sales History","Basic Reports"]'),
  ('Business',1999, 'KES','monthly',10,5000,'["All Starter","Quotations","Invoices","Purchases","Expenses","Inventory Reports","Staff Management"]'),
  ('Enterprise',4999,'KES','monthly',50,NULL,'["All Business","Multi-location","API Access","Priority Support","Custom Receipt"]')
ON CONFLICT(name) DO NOTHING;

-- ─── Audit Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id),
  action      text NOT NULL,  -- create | update | delete | login | logout | approve
  table_name  text,
  record_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user   ON audit_logs(user_id,   created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

-- Helper: get tenant_id of current user (SECURITY DEFINER avoids policy loops)
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- Helper: get role of current user
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- Quotations
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_quotations"  ON quotations;
DROP POLICY IF EXISTS "tenant_insert_quotations"  ON quotations;
DROP POLICY IF EXISTS "tenant_update_quotations"  ON quotations;
DROP POLICY IF EXISTS "tenant_delete_quotations"  ON quotations;
CREATE POLICY "tenant_select_quotations" ON quotations FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_insert_quotations" ON quotations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_update_quotations" ON quotations FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_delete_quotations" ON quotations FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');

-- Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_invoices" ON invoices;
DROP POLICY IF EXISTS "tenant_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "tenant_update_invoices" ON invoices;
DROP POLICY IF EXISTS "tenant_delete_invoices" ON invoices;
CREATE POLICY "tenant_select_invoices" ON invoices FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_insert_invoices" ON invoices FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager','cashier'));
CREATE POLICY "tenant_update_invoices" ON invoices FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_delete_invoices" ON invoices FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');

-- Invoice Payments
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_invoice_payments" ON invoice_payments;
DROP POLICY IF EXISTS "tenant_insert_invoice_payments" ON invoice_payments;
DROP POLICY IF EXISTS "tenant_delete_invoice_payments" ON invoice_payments;
CREATE POLICY "tenant_select_invoice_payments" ON invoice_payments FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_insert_invoice_payments" ON invoice_payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager','cashier'));
CREATE POLICY "tenant_delete_invoice_payments" ON invoice_payments FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');

-- Sales Returns
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_returns" ON sales_returns;
DROP POLICY IF EXISTS "tenant_insert_returns" ON sales_returns;
DROP POLICY IF EXISTS "tenant_update_returns" ON sales_returns;
DROP POLICY IF EXISTS "tenant_delete_returns" ON sales_returns;
CREATE POLICY "tenant_select_returns" ON sales_returns FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_insert_returns" ON sales_returns FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager','cashier'));
CREATE POLICY "tenant_update_returns" ON sales_returns FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_delete_returns" ON sales_returns FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');

-- Stock Movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "tenant_insert_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "tenant_delete_stock_movements" ON stock_movements;
CREATE POLICY "tenant_select_stock_movements" ON stock_movements FOR SELECT TO authenticated
  USING (
    tenant_id = current_tenant_id() OR current_user_role() = 'superadmin'
    OR product_id IN (SELECT id FROM products WHERE tenant_id = current_tenant_id())
  );
CREATE POLICY "tenant_insert_stock_movements" ON stock_movements FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_delete_stock_movements" ON stock_movements FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');

-- Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_expenses" ON expenses;
DROP POLICY IF EXISTS "tenant_insert_expenses" ON expenses;
DROP POLICY IF EXISTS "tenant_update_expenses" ON expenses;
DROP POLICY IF EXISTS "tenant_delete_expenses" ON expenses;
CREATE POLICY "tenant_select_expenses" ON expenses FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_insert_expenses" ON expenses FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_update_expenses" ON expenses FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_delete_expenses" ON expenses FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');

-- Expense Categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_expense_cats" ON expense_categories;
DROP POLICY IF EXISTS "tenant_insert_expense_cats" ON expense_categories;
DROP POLICY IF EXISTS "tenant_update_expense_cats" ON expense_categories;
DROP POLICY IF EXISTS "tenant_delete_expense_cats" ON expense_categories;
CREATE POLICY "tenant_select_expense_cats" ON expense_categories FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_insert_expense_cats" ON expense_categories FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_update_expense_cats" ON expense_categories FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_delete_expense_cats" ON expense_categories FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');

-- Tax Rates
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_tax_rates" ON tax_rates;
DROP POLICY IF EXISTS "tenant_insert_tax_rates" ON tax_rates;
DROP POLICY IF EXISTS "tenant_update_tax_rates" ON tax_rates;
DROP POLICY IF EXISTS "tenant_delete_tax_rates" ON tax_rates;
CREATE POLICY "tenant_select_tax_rates" ON tax_rates FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_insert_tax_rates" ON tax_rates FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() = 'owner');
CREATE POLICY "tenant_update_tax_rates" ON tax_rates FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');
CREATE POLICY "tenant_delete_tax_rates" ON tax_rates FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');

-- Purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_purchases" ON purchases;
DROP POLICY IF EXISTS "tenant_insert_purchases" ON purchases;
DROP POLICY IF EXISTS "tenant_update_purchases" ON purchases;
DROP POLICY IF EXISTS "tenant_delete_purchases" ON purchases;
CREATE POLICY "tenant_select_purchases" ON purchases FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_insert_purchases" ON purchases FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_update_purchases" ON purchases FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() IN ('owner','manager'));
CREATE POLICY "tenant_delete_purchases" ON purchases FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'owner');

-- Subscription Plans (public read, SA write)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_plans" ON subscription_plans;
DROP POLICY IF EXISTS "sa_manage_plans"     ON subscription_plans;
CREATE POLICY "public_select_plans" ON subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "sa_manage_plans"     ON subscription_plans FOR ALL    TO authenticated
  USING (current_user_role() = 'superadmin');

-- Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_audit" ON audit_logs;
DROP POLICY IF EXISTS "tenant_insert_audit" ON audit_logs;
CREATE POLICY "tenant_select_audit" ON audit_logs FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_insert_audit" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');

-- ─── RPC: apply_stock_return (reverses stock on approved return) ─────────────
CREATE OR REPLACE FUNCTION apply_stock_return(p_return_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_return sales_returns;
  v_item   jsonb;
  v_pid    uuid;
  v_qty    integer;
  v_bal    integer;
BEGIN
  SELECT * INTO v_return FROM sales_returns WHERE id = p_return_id;
  IF v_return.status != 'approved' THEN RAISE EXCEPTION 'Return must be approved first'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_return.items) LOOP
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'qty')::integer;
    UPDATE products SET stock = stock + v_qty WHERE id = v_pid AND tenant_id = v_return.tenant_id
    RETURNING stock INTO v_bal;
    INSERT INTO stock_movements(tenant_id,product_id,movement_type,quantity,balance_after,reference_id,reference_type,notes)
    VALUES(v_return.tenant_id,v_pid,'return',v_qty,v_bal,p_return_id,'return','Sales return ' || v_return.return_number);
  END LOOP;

  UPDATE sales_returns SET status='completed', updated_at=now() WHERE id=p_return_id;
END;
$$;

-- ─── RPC: receive_purchase (updates stock + avg cost) ────────────────────────
CREATE OR REPLACE FUNCTION receive_purchase(p_purchase_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pur  purchases;
  v_item jsonb;
  v_pid  uuid;
  v_qty  integer;
  v_cost numeric;
  v_bal  integer;
  v_cur_stock integer;
  v_cur_cost  numeric;
BEGIN
  SELECT * INTO v_pur FROM purchases WHERE id = p_purchase_id;
  IF v_pur.status != 'received' THEN RAISE EXCEPTION 'Purchase must be in received status'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_pur.items) LOOP
    v_pid  := (v_item->>'product_id')::uuid;
    v_qty  := (v_item->>'qty')::integer;
    v_cost := (v_item->>'unit_cost')::numeric;

    -- Weighted average cost update
    SELECT stock, COALESCE(average_cost, buying_cost, 0) INTO v_cur_stock, v_cur_cost
      FROM products WHERE id = v_pid AND tenant_id = v_pur.tenant_id;

    UPDATE products SET
      stock = stock + v_qty,
      average_cost = CASE WHEN (v_cur_stock + v_qty) > 0
        THEN ((v_cur_stock * v_cur_cost) + (v_qty * v_cost)) / (v_cur_stock + v_qty)
        ELSE v_cost END,
      last_purchase_cost = v_cost,
      updated_at = now()
    WHERE id = v_pid AND tenant_id = v_pur.tenant_id
    RETURNING stock INTO v_bal;

    INSERT INTO stock_movements(tenant_id,product_id,movement_type,quantity,balance_after,unit_cost,reference_id,reference_type,notes)
    VALUES(v_pur.tenant_id,v_pid,'purchase',v_qty,v_bal,v_cost,p_purchase_id,'purchase','Purchase ' || v_pur.purchase_number);
  END LOOP;
END;
$$;

-- ─── RPC: get_profit_summary (standardised P&L) ──────────────────────────────
CREATE OR REPLACE FUNCTION get_profit_summary(
  p_tenant_id uuid,
  p_from      timestamptz DEFAULT NULL,
  p_to        timestamptz DEFAULT NULL
)
RETURNS TABLE(
  gross_revenue   numeric,
  total_cogs      numeric,
  gross_profit    numeric,
  total_expenses  numeric,
  total_returns   numeric,
  net_profit      numeric
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM(COALESCE(s.subtotal, s.total)),0)   AS gross_revenue,
    COALESCE(SUM(s.cogs_amount),0)                   AS total_cogs,
    COALESCE(SUM(s.profit_amount),0)                 AS gross_profit,
    (SELECT COALESCE(SUM(e.total_amount),0) FROM expenses e
     WHERE e.tenant_id = p_tenant_id AND e.status = 'approved'
       AND (p_from IS NULL OR e.expense_date >= p_from::date)
       AND (p_to   IS NULL OR e.expense_date <= p_to::date))   AS total_expenses,
    (SELECT COALESCE(SUM(r.total),0) FROM sales_returns r
     WHERE r.tenant_id = p_tenant_id AND r.status = 'completed'
       AND (p_from IS NULL OR r.created_at >= p_from)
       AND (p_to   IS NULL OR r.created_at <= p_to))           AS total_returns,
    COALESCE(SUM(s.profit_amount),0)
      - (SELECT COALESCE(SUM(e.total_amount),0) FROM expenses e
         WHERE e.tenant_id = p_tenant_id AND e.status = 'approved'
           AND (p_from IS NULL OR e.expense_date >= p_from::date)
           AND (p_to   IS NULL OR e.expense_date <= p_to::date))
      - (SELECT COALESCE(SUM(r.total),0) FROM sales_returns r
         WHERE r.tenant_id = p_tenant_id AND r.status = 'completed'
           AND (p_from IS NULL OR r.created_at >= p_from)
           AND (p_to   IS NULL OR r.created_at <= p_to))       AS net_profit
  FROM sales s
  WHERE s.tenant_id = p_tenant_id
    AND s.status = 'completed'
    AND (p_from IS NULL OR s.created_at >= p_from)
    AND (p_to   IS NULL OR s.created_at <= p_to);
$$;
