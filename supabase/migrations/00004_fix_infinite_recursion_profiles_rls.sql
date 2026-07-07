
-- ── Step 1: Drop all recursive policies added in previous migration ────────────
DROP POLICY IF EXISTS "owner_read_tenant_profiles"   ON profiles;
DROP POLICY IF EXISTS "cashier_read_tenant_profiles" ON profiles;
DROP POLICY IF EXISTS "owner_update_tenant_staff_profiles" ON profiles;

-- ── Step 2: Create SECURITY DEFINER helpers (bypass RLS, no recursion) ─────────
-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Returns the tenant_id of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── Step 3: Recreate owner profile-read policy (no recursion) ──────────────────
CREATE POLICY "owner_read_tenant_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR (
    get_my_role()      = 'owner'
    AND tenant_id      = get_my_tenant_id()
  )
);

-- ── Step 4: Recreate cashier profile-read policy (no recursion) ────────────────
CREATE POLICY "cashier_read_tenant_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR (
    get_my_role()  = 'cashier'
    AND tenant_id  = get_my_tenant_id()
  )
);

-- ── Step 5: Recreate owner staff-update policy (no recursion) ──────────────────
DROP FUNCTION IF EXISTS can_manage_staff_profile(uuid);

CREATE FUNCTION can_manage_staff_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles target_p
    WHERE target_p.id        = target_profile_id
      AND target_p.tenant_id = get_my_tenant_id()
      AND target_p.role      = 'cashier'
      AND get_my_role()      = 'owner'
  );
$$;

CREATE POLICY "owner_update_tenant_staff_profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (can_manage_staff_profile(id))
WITH CHECK (
  can_manage_staff_profile(id)
  AND role = 'cashier'
);
