
-- Add currency configuration columns to tenants (KES default for all businesses)
ALTER TABLE tenants
  ADD COLUMN currency_code  text NOT NULL DEFAULT 'KES',
  ADD COLUMN currency_symbol text NOT NULL DEFAULT 'KSh',
  ADD COLUMN currency_name  text NOT NULL DEFAULT 'Kenyan Shilling';

-- Back-fill any rows that already exist
UPDATE tenants
SET
  currency_code   = 'KES',
  currency_symbol = 'KSh',
  currency_name   = 'Kenyan Shilling'
WHERE currency_code = 'KES';   -- matches the default; harmless no-op for new rows
