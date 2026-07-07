
-- Enums
CREATE TYPE public.user_role AS ENUM ('superadmin', 'owner', 'cashier');
CREATE TYPE public.license_status AS ENUM ('pending', 'active', 'revoked');

-- Tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  license_key text UNIQUE NOT NULL DEFAULT upper(replace(gen_random_uuid()::text, '-', '')),
  is_activated boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  role public.user_role NOT NULL DEFAULT 'cashier',
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payment licenses table
CREATE TABLE public.payment_licenses (
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

-- Auto-sync profiles on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'cashier'),
    (NEW.raw_user_meta_data->>'tenant_id')::uuid
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payment_licenses_updated_at BEFORE UPDATE ON public.payment_licenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: get user role
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- Helper: get user tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant(uid uuid)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = uid;
$$;

-- RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_licenses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "superadmin_full_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "users_view_own_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- Tenants policies
CREATE POLICY "superadmin_full_tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "tenant_members_view_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = get_user_tenant(auth.uid()));

CREATE POLICY "owner_update_own_tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) = 'owner');

-- Payment licenses policies
CREATE POLICY "superadmin_full_licenses" ON public.payment_licenses
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "tenant_view_own_licenses" ON public.payment_licenses
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));

-- Public view for safe sharing
CREATE VIEW public.public_profiles AS
  SELECT id, username, role, tenant_id FROM public.profiles;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_licenses;
