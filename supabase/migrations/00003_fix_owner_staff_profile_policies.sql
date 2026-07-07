
-- ── Helper: can this user manage a profile in the same tenant? ────────────────
CREATE OR REPLACE FUNCTION can_manage_staff_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles owner_p
    JOIN profiles target_p ON target_p.id = target_profile_id
    WHERE owner_p.id        = auth.uid()
      AND owner_p.role      = 'owner'
      AND owner_p.tenant_id = target_p.tenant_id
      AND target_p.role     = 'cashier'
  );
$$;

-- ── 1. Owners can SELECT all profiles within their tenant ─────────────────────
CREATE POLICY "owner_read_tenant_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR
  (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
);

-- ── 2. Owners can UPDATE cashier profiles within their tenant ─────────────────
CREATE POLICY "owner_update_tenant_staff_profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (can_manage_staff_profile(id))
WITH CHECK (
  can_manage_staff_profile(id)
  AND role = 'cashier'
);

-- ── 3. Cashiers can SELECT profiles in their tenant ────────────────────────────
CREATE POLICY "cashier_read_tenant_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR
  (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'cashier'
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
);
