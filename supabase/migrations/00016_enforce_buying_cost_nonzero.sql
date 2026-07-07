
-- Ensure buying_cost is properly set; remove silent zero default so new inserts must provide it explicitly
-- (existing rows keep their value; the app now validates > 0 before insert)
ALTER TABLE products ALTER COLUMN buying_cost DROP DEFAULT;

-- Add profit_amount to sales for direct per-sale profit tracking
ALTER TABLE sales ADD COLUMN IF NOT EXISTS profit_amount numeric(12,2) NOT NULL DEFAULT 0;

-- Index for profit aggregation
CREATE INDEX IF NOT EXISTS idx_sales_profit ON sales(tenant_id, created_at, profit_amount);
