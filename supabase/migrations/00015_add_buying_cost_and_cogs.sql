
-- Add buying_cost to products (cost price the owner paid per unit)
ALTER TABLE products ADD COLUMN IF NOT EXISTS buying_cost numeric(12,2) NOT NULL DEFAULT 0;

-- Add cogs_amount to sales (computed at checkout: sum of qty * buying_cost per item)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cogs_amount numeric(12,2) NOT NULL DEFAULT 0;

-- Index for profit queries over time ranges
CREATE INDEX IF NOT EXISTS idx_sales_cogs ON sales(tenant_id, created_at, cogs_amount);
