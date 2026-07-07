
-- Subscriptions table: one row per tenant, tracks plan + trial + payment
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'trialing',
  trial_start_date timestamptz NOT NULL DEFAULT now(),
  trial_end_date timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  activated_at timestamptz,
  payment_reference text,
  payment_method text,
  amount numeric(10,2),
  mpesa_phone text,
  mpesa_checkout_request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Payment events log
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  reference text,
  amount numeric(10,2),
  phone text,
  checkout_request_id text,
  result_code text,
  result_desc text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add trial_days_remaining function
CREATE OR REPLACE FUNCTION get_trial_days_remaining(p_tenant_id uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_end timestamptz;
  v_status text;
BEGIN
  SELECT trial_end_date, status INTO v_end, v_status
  FROM subscriptions WHERE tenant_id = p_tenant_id;
  IF NOT FOUND OR v_status = 'active' THEN RETURN NULL; END IF;
  RETURN GREATEST(0, EXTRACT(DAY FROM (v_end - now()))::int);
END;
$$;

-- Auto-create subscription row when tenant is created
CREATE OR REPLACE FUNCTION auto_create_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (tenant_id, plan, status, trial_start_date, trial_end_date)
  VALUES (NEW.id, 'trial', 'trialing', now(), now() + interval '14 days')
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_subscription ON tenants;
CREATE TRIGGER trg_auto_subscription
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION auto_create_subscription();

-- Back-fill existing tenants that have no subscription row
INSERT INTO subscriptions (tenant_id, plan, status, trial_start_date, trial_end_date)
SELECT id, 'trial', 'trialing', created_at, created_at + interval '14 days'
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM subscriptions);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Subscriptions: owner/cashier can read their own tenant row, superadmin reads all
DROP POLICY IF EXISTS sub_read_own ON subscriptions;
CREATE POLICY sub_read_own ON subscriptions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS sub_update_own ON subscriptions;
CREATE POLICY sub_update_own ON subscriptions FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'owner')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS sub_insert_service ON subscriptions;
CREATE POLICY sub_insert_service ON subscriptions FOR INSERT
  WITH CHECK (true);

-- Payment events: owner can read own, superadmin reads all
DROP POLICY IF EXISTS pe_read_own ON payment_events;
CREATE POLICY pe_read_own ON payment_events FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS pe_insert_any ON payment_events;
CREATE POLICY pe_insert_any ON payment_events FOR INSERT WITH CHECK (true);

-- Superadmin read policies for aggregation
DROP POLICY IF EXISTS sa_read_profiles ON profiles;
CREATE POLICY sa_read_profiles ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

DROP POLICY IF EXISTS sa_read_tenants ON tenants;
CREATE POLICY sa_read_tenants ON tenants FOR SELECT
  USING (
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );
