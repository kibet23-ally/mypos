-- CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  loyalty_points integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_customers" ON public.customers;
CREATE POLICY "tenant_customers" ON public.customers FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin');

-- SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_suppliers" ON public.suppliers;
CREATE POLICY "tenant_suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin');

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_notifications" ON public.notifications;
CREATE POLICY "tenant_notifications" ON public.notifications FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin');

-- SALES: add customer_id & discount columns if missing
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notes text;

-- PURCHASE ORDERS (supplier purchases)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'received',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_purchase_orders" ON public.purchase_orders;
CREATE POLICY "tenant_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin');