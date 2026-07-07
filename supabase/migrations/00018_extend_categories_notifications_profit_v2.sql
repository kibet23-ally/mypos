
-- ─── Extend categories ───────────────────────────────────────────────────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- ─── Extend notifications ────────────────────────────────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS priority   TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS read       BOOLEAN NOT NULL DEFAULT false;

-- ─── Profit RPC: drop old signature first, then recreate ─────────────────────
DROP FUNCTION IF EXISTS get_profit_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION get_profit_summary(
  p_tenant_id UUID,
  p_from       TIMESTAMPTZ,
  p_to         TIMESTAMPTZ
)
RETURNS TABLE (
  total_revenue    NUMERIC,
  total_cogs       NUMERIC,
  gross_profit     NUMERIC,
  total_expenses   NUMERIC,
  total_returns    NUMERIC,
  net_profit       NUMERIC,
  gross_margin_pct NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_revenue  NUMERIC := 0;
  v_cogs     NUMERIC := 0;
  v_expenses NUMERIC := 0;
  v_returns  NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(total_amount),0), COALESCE(SUM(cogs_amount),0)
  INTO v_revenue, v_cogs
  FROM sales
  WHERE tenant_id = p_tenant_id AND created_at BETWEEN p_from AND p_to;

  SELECT COALESCE(SUM(total_amount),0)
  INTO v_expenses
  FROM expenses
  WHERE tenant_id = p_tenant_id AND status = 'approved'
    AND expense_date BETWEEN p_from::DATE AND p_to::DATE;

  SELECT COALESCE(SUM(refund_amount),0)
  INTO v_returns
  FROM sales_returns
  WHERE tenant_id = p_tenant_id AND status IN ('approved','completed')
    AND created_at BETWEEN p_from AND p_to;

  total_revenue    := v_revenue;
  total_cogs       := v_cogs;
  gross_profit     := v_revenue - v_cogs;
  total_expenses   := v_expenses;
  total_returns    := v_returns;
  net_profit       := (v_revenue - v_cogs) - v_expenses - v_returns;
  gross_margin_pct := CASE WHEN v_revenue > 0
                       THEN ROUND(((v_revenue - v_cogs) / v_revenue) * 100, 2)
                       ELSE 0 END;
  RETURN NEXT;
END;
$$;

-- ─── Performance indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_tenant_created     ON sales(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_status      ON sales(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date     ON expenses(tenant_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_returns_tenant_created   ON sales_returns(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_tenant        ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant     ON notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status   ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_status ON quotations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_tenant         ON purchases(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mvmt_tenant        ON stock_movements(tenant_id, product_id, created_at DESC);
