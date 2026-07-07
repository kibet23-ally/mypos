
-- ═══════════════════════════════════════════════════════════════════
-- PosifyPro Financial Calculation RPCs
-- All calculations use live DB columns:
--   sale_items: line_total, cost_price, quantity, discount_pct,
--               tax_amount, tenant_id (all already exist in live DB)
--   sales:      total_amount, discount_amount, tax_amount, subtotal,
--               status='completed', tenant_id
--
-- Definitions enforced across ALL views:
--   revenue      = Σ line_total per item   (price*qty after item discount)
--   cogs         = Σ cost_price * quantity  (snapshot at sale time)
--   gross_profit = revenue - cogs
--   net_profit   = gross_profit  (no expenses table yet)
--   margin_pct   = (gross_profit / revenue) * 100
--   inventory_value = Σ (quantity_on_hand * cost_price) current stock
-- ═══════════════════════════════════════════════════════════════════

-- ── RPC 1: get_financial_summary ──────────────────────────────────
-- Aggregate totals for a tenant over a date range.
CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_tenant_id uuid,
  p_start_at  timestamptz,
  p_end_at    timestamptz
)
RETURNS TABLE (
  revenue            numeric,
  cogs               numeric,
  gross_profit       numeric,
  net_profit         numeric,
  margin_pct         numeric,
  transaction_count  bigint,
  avg_order_value    numeric,
  total_discount     numeric,
  total_tax          numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH completed AS (
    SELECT id
    FROM   public.sales
    WHERE  tenant_id   = p_tenant_id
      AND  status      = 'completed'
      AND  created_at  BETWEEN p_start_at AND p_end_at
  ),
  agg AS (
    SELECT
      SUM(si.line_total)                        AS revenue,
      SUM(si.cost_price * si.quantity)          AS cogs,
      SUM(si.line_total * si.discount_pct / 100.0
          / NULLIF(1.0 - si.discount_pct / 100.0, 0))
                                                AS total_discount,
      SUM(si.tax_amount)                        AS total_tax
    FROM public.sale_items si
    JOIN completed         cs ON cs.id = si.sale_id
    WHERE si.tenant_id = p_tenant_id
  ),
  cnt AS (SELECT COUNT(*) AS n FROM completed)
  SELECT
    COALESCE(a.revenue, 0),
    COALESCE(a.cogs, 0),
    COALESCE(a.revenue, 0) - COALESCE(a.cogs, 0),
    COALESCE(a.revenue, 0) - COALESCE(a.cogs, 0),
    CASE WHEN COALESCE(a.revenue, 0) > 0
         THEN ROUND((COALESCE(a.revenue,0) - COALESCE(a.cogs,0))
                    / a.revenue * 100, 2)
         ELSE 0 END,
    c.n,
    CASE WHEN c.n > 0
         THEN ROUND(COALESCE(a.revenue, 0) / c.n, 2)
         ELSE 0 END,
    COALESCE(a.total_discount, 0),
    COALESCE(a.total_tax, 0)
  FROM agg a, cnt c;
$$;

-- ── RPC 2: get_financial_summary_by_period ────────────────────────
-- Per-period breakdown (hour / day / month).
CREATE OR REPLACE FUNCTION public.get_financial_summary_by_period(
  p_tenant_id uuid,
  p_start_at  timestamptz,
  p_end_at    timestamptz,
  p_period    text DEFAULT 'month'
)
RETURNS TABLE (
  period_key   text,
  revenue      numeric,
  cogs         numeric,
  gross_profit numeric,
  orders       bigint,
  discount     numeric,
  tax          numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    to_char(date_trunc(p_period, s.created_at), CASE
      WHEN p_period = 'hour'  THEN 'HH24'
      WHEN p_period = 'day'   THEN 'YYYY-MM-DD'
      ELSE                         'YYYY-MM'
    END)                                             AS period_key,
    SUM(si.line_total)                               AS revenue,
    SUM(si.cost_price * si.quantity)                 AS cogs,
    SUM(si.line_total - si.cost_price * si.quantity) AS gross_profit,
    COUNT(DISTINCT s.id)                             AS orders,
    SUM(si.line_total * si.discount_pct / 100.0
        / NULLIF(1.0 - si.discount_pct / 100.0, 0)) AS discount,
    SUM(si.tax_amount)                               AS tax
  FROM public.sales      s
  JOIN public.sale_items si ON si.sale_id = s.id
  WHERE s.tenant_id  = p_tenant_id
    AND s.status     = 'completed'
    AND s.created_at BETWEEN p_start_at AND p_end_at
    AND si.tenant_id = p_tenant_id
  GROUP BY 1
  ORDER BY 1;
$$;

-- ── RPC 3: get_inventory_value ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_inventory_value(p_tenant_id uuid)
RETURNS TABLE (
  total_value     numeric,
  low_stock_count bigint,
  out_of_stock    bigint,
  total_sku_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(i.quantity_on_hand * p.cost_price), 0),
    COUNT(*) FILTER (WHERE i.quantity_on_hand > 0
                       AND i.quantity_on_hand <= i.reorder_level),
    COUNT(*) FILTER (WHERE i.quantity_on_hand <= 0),
    COUNT(*)
  FROM public.inventory i
  JOIN public.products  p ON p.id = i.product_id
  WHERE i.tenant_id = p_tenant_id
    AND p.is_active  = true;
$$;

-- ── RPC 4: get_top_products ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_top_products(
  p_tenant_id uuid,
  p_start_at  timestamptz,
  p_end_at    timestamptz,
  p_limit     int DEFAULT 5
)
RETURNS TABLE (
  product_id   uuid,
  product_name text,
  qty_sold     numeric,
  revenue      numeric,
  cogs         numeric,
  gross_profit numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    si.product_id,
    si.product_name,
    SUM(si.quantity)                                    AS qty_sold,
    SUM(si.line_total)                                  AS revenue,
    SUM(si.cost_price * si.quantity)                    AS cogs,
    SUM(si.line_total - si.cost_price * si.quantity)    AS gross_profit
  FROM public.sale_items si
  JOIN public.sales      s ON s.id = si.sale_id
  WHERE s.tenant_id  = p_tenant_id
    AND s.status     = 'completed'
    AND s.created_at BETWEEN p_start_at AND p_end_at
    AND si.tenant_id = p_tenant_id
  GROUP BY si.product_id, si.product_name
  ORDER BY revenue DESC
  LIMIT p_limit;
$$;

-- ── RPC 5: get_category_revenue ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_category_revenue(
  p_tenant_id uuid,
  p_start_at  timestamptz,
  p_end_at    timestamptz
)
RETURNS TABLE (
  category_name text,
  revenue       numeric,
  orders        bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(c.name, 'Uncategorised') AS category_name,
    SUM(si.line_total)                AS revenue,
    COUNT(DISTINCT s.id)              AS orders
  FROM public.sale_items si
  JOIN public.sales      s  ON  s.id = si.sale_id
  JOIN public.products   p  ON  p.id = si.product_id
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE s.tenant_id  = p_tenant_id
    AND s.status     = 'completed'
    AND s.created_at BETWEEN p_start_at AND p_end_at
    AND si.tenant_id = p_tenant_id
  GROUP BY c.name
  ORDER BY revenue DESC
  LIMIT 8;
$$;

-- ── RPC 6: get_cashier_shift_summary ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_cashier_shift_summary(
  p_cashier_id uuid,
  p_tenant_id  uuid,
  p_start_at   timestamptz,
  p_end_at     timestamptz
)
RETURNS TABLE (
  revenue            numeric,
  transaction_count  bigint,
  avg_order_value    numeric,
  items_sold         numeric,
  unique_customers   bigint,
  refund_count       bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH shift AS (
    SELECT id, total_amount, customer_id, status
    FROM   public.sales
    WHERE  cashier_id = p_cashier_id
      AND  tenant_id  = p_tenant_id
      AND  created_at BETWEEN p_start_at AND p_end_at
  )
  SELECT
    COALESCE(SUM(total_amount) FILTER (WHERE status='completed'), 0),
    COUNT(*)            FILTER (WHERE status='completed'),
    CASE WHEN COUNT(*) FILTER (WHERE status='completed') > 0
         THEN ROUND(SUM(total_amount) FILTER (WHERE status='completed')
              / COUNT(*) FILTER (WHERE status='completed'), 2)
         ELSE 0 END,
    COALESCE((
      SELECT SUM(si.quantity)
      FROM   public.sale_items si
      JOIN   shift cs ON cs.id = si.sale_id
      WHERE  cs.status = 'completed'
    ), 0),
    COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL
                                          AND status='completed'),
    COUNT(*) FILTER (WHERE status='refunded')
  FROM shift;
$$;
