
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('superadmin', 'owner', 'cashier');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.license_status AS ENUM ('pending', 'active', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  license_key text UNIQUE NOT NULL DEFAULT upper(replace(gen_random_uuid()::text, '-', '')),
  is_activated boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  created_by uuid,
  trial_start_date timestamptz,
  trial_end_date timestamptz,
  currency text NOT NULL DEFAULT 'KES',
  tax_rate numeric(5,2) NOT NULL DEFAULT 8.5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  email text NOT NULL,
  phone_number text,
  display_name text,
  role public.user_role NOT NULL DEFAULT 'cashier',
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payment licenses table
CREATE TABLE IF NOT EXISTS public.payment_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  license_key text NOT NULL,
  payment_reference text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status public.license_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'General',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cashier_id uuid REFERENCES auth.users(id),
  items jsonb NOT NULL DEFAULT '[]',
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tenants_updated_at ON public.tenants;
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = uid; $$;

CREATE OR REPLACE FUNCTION public.get_user_tenant(uid uuid)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.profiles WHERE id = uid; $$;

-- RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "users_view_own_profile" ON public.profiles;
CREATE POLICY "users_view_own_profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR get_user_role(auth.uid()) = 'superadmin');
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "service_insert_profiles" ON public.profiles;
CREATE POLICY "service_insert_profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- Tenants policies
DROP POLICY IF EXISTS "tenant_members_view_own" ON public.tenants;
CREATE POLICY "tenant_members_view_own" ON public.tenants FOR SELECT TO authenticated USING (id = get_user_tenant(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin');
DROP POLICY IF EXISTS "owner_update_own_tenant" ON public.tenants;
CREATE POLICY "owner_update_own_tenant" ON public.tenants FOR UPDATE TO authenticated USING (id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) = 'owner');
DROP POLICY IF EXISTS "service_insert_tenants" ON public.tenants;
CREATE POLICY "service_insert_tenants" ON public.tenants FOR INSERT WITH CHECK (true);

-- Products policies
DROP POLICY IF EXISTS "tenant_view_products" ON public.products;
CREATE POLICY "tenant_view_products" ON public.products FOR SELECT TO authenticated USING (tenant_id = get_user_tenant(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin');
DROP POLICY IF EXISTS "owner_manage_products" ON public.products;
CREATE POLICY "owner_manage_products" ON public.products FOR ALL TO authenticated USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) IN ('owner', 'superadmin'));
DROP POLICY IF EXISTS "cashier_update_products" ON public.products;
CREATE POLICY "cashier_update_products" ON public.products FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant(auth.uid()));

-- Sales policies
DROP POLICY IF EXISTS "tenant_view_sales" ON public.sales;
CREATE POLICY "tenant_view_sales" ON public.sales FOR SELECT TO authenticated USING (tenant_id = get_user_tenant(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin');
DROP POLICY IF EXISTS "tenant_insert_sales" ON public.sales;
CREATE POLICY "tenant_insert_sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
