
-- Add missing columns to subscriptions table (idempotent)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS mpesa_phone text,
  ADD COLUMN IF NOT EXISTS mpesa_checkout_request_id text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'starter';

-- Add is_activated to tenants (idempotent)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS is_activated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- Add extra columns to payment_events (idempotent)
ALTER TABLE payment_events
  ADD COLUMN IF NOT EXISTS checkout_request_id text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS result_code text,
  ADD COLUMN IF NOT EXISTS result_desc text;

-- Index for fast callback lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_mpesa_checkout
  ON subscriptions(mpesa_checkout_request_id)
  WHERE mpesa_checkout_request_id IS NOT NULL;

-- Grant SA: allow superadmin to read payment_events
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SA can read payment_events" ON payment_events;
CREATE POLICY "SA can read payment_events" ON payment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "SA can insert payment_events" ON payment_events;
CREATE POLICY "SA can insert payment_events" ON payment_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Tenant can read own payment_events" ON payment_events;
CREATE POLICY "Tenant can read own payment_events" ON payment_events
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
