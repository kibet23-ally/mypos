
-- ══════════════════════════════════════════════════════
-- SECURITY: Prevent privilege escalation
-- Only the service_role can assign or change the superadmin role.
-- Regular authenticated users (including owners) cannot self-promote.
-- ══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION prevent_superadmin_self_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Block any attempt to set role = superadmin from client-side
  IF NEW.role = 'superadmin' AND current_setting('role', true) != 'service_role' THEN
    -- Allow only if caller is already a superadmin (e.g. SA managing SA)
    IF NOT is_superadmin() THEN
      RAISE EXCEPTION 'Access denied: superadmin role can only be assigned by a platform administrator.';
    END IF;
  END IF;

  -- Block demoting an existing superadmin without being a superadmin
  IF OLD IS NOT NULL AND OLD.role = 'superadmin' AND NEW.role != 'superadmin' THEN
    IF NOT is_superadmin() THEN
      RAISE EXCEPTION 'Access denied: superadmin role cannot be removed without platform administrator privileges.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_superadmin_escalation
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_superadmin_self_assignment();

-- ══════════════════════════════════════════════════════
-- SECURITY: Default role for new profiles is 'cashier'
-- This ensures no user can accidentally get elevated access
-- ══════════════════════════════════════════════════════
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'cashier';

-- ══════════════════════════════════════════════════════
-- HELPER: Count of superadmins (for frontend info)
-- ══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_superadmin_count()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::integer FROM profiles WHERE role = 'superadmin';
$$;

-- ══════════════════════════════════════════════════════
-- NOTICE: Superadmin will be created after schema is applied
-- ══════════════════════════════════════════════════════
DO $$
DECLARE
  sa_count integer;
BEGIN
  SELECT COUNT(*) INTO sa_count FROM profiles WHERE role = 'superadmin';
  -- IF sa_count = 0 THEN
    -- RAISE EXCEPTION 'No superadmin found — setup incomplete!';
  -- END IF;
  RAISE NOTICE 'Superadmin count: %', sa_count;
END;
$$;
