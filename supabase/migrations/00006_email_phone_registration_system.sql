
-- 1. Add phone_number to profiles (nullable first for safe migration of existing rows)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS display_name text;

-- 2. Make username nullable (existing rows keep their value; new flow won't use it)
ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;

-- 3. Add unique constraint on phone_number (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique
  ON public.profiles (phone_number)
  WHERE phone_number IS NOT NULL;

-- 4. Add trial columns to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz;

-- 5. Auto-start 14-day trial when a new tenant is created
CREATE OR REPLACE FUNCTION public.handle_new_tenant_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_start_date IS NULL THEN
    NEW.trial_start_date := now();
    NEW.trial_end_date   := now() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tenant_created_set_trial ON public.tenants;
CREATE TRIGGER on_tenant_created_set_trial
  BEFORE INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant_trial();

-- 6. Helper: get tenant_id for a user (SECURITY DEFINER — bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(uid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = uid LIMIT 1;
$$;

-- 7. RLS — ensure profiles policies cover email/phone lookups
-- (Existing policies stay; add a policy for users to read their own row if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can view own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can view own profile"
        ON public.profiles FOR SELECT
        TO authenticated
        USING (id = auth.uid());
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can update own profile"
        ON public.profiles FOR UPDATE
        TO authenticated
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid());
    $policy$;
  END IF;
END;
$$;
