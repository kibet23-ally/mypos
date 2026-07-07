/**
 * calcEngine.ts — PosifyPro Centralized Financial Calculation Engine
 *
 * SINGLE SOURCE OF TRUTH for all revenue, profit, COGS, margin, and
 * inventory-value calculations across the entire application.
 *
 * Canonical formulae (enforced here and in matching Supabase RPCs):
 *   Revenue      = Σ sale_items.subtotal            [= unit_price×qty − discount_amount]
 *   COGS         = Σ (buying_cost_snapshot × qty)   [snapshot captured at sale time, NOT current cost]
 *   Gross Profit = Revenue − COGS
 *   Gross Margin = (Gross Profit ÷ Revenue) × 100
 *   Net Profit   = Gross Profit − Expenses − Returns  [see 00036 migration]
 *   Inventory Val= Σ (products.stock × products.cost_price)  [current cost, NOT snapshot]
 *
 * ⚠️  NEVER write profit as Revenue × fixed_percentage anywhere in the app.
 * ⚠️  NEVER use products.cost_price for historical sale COGS. Always use buying_cost_snapshot.
 */

import { supabase } from '@/db/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinancialSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  marginPct: number;
  transactionCount: number;
  avgOrderValue: number;
  totalDiscount: number;
  totalTax: number;
}

export interface PeriodRow {
  periodKey: string;   // YYYY-MM | YYYY-MM-DD | HH
  revenue: number;
  cogs: number;
  grossProfit: number;
  orders: number;
  discount: number;
  tax: number;
  /** Derived: grossProfit / revenue * 100 — computed client-side for chart labelling */
  marginPct: number;
}

export interface InventorySummary {
  totalValue: number;
  lowStockCount: number;
  outOfStock: number;
  totalSkuCount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  qtySold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
}

export interface CategoryRevenue {
  categoryName: string;
  revenue: number;
  orders: number;
}

export interface CashierShiftSummary {
  revenue: number;
  transactionCount: number;
  avgOrderValue: number;
  itemsSold: number;
  uniqueCustomers: number;
  refundCount: number;
}

export type CalcPeriod = 'hour' | 'day' | 'month';

// ─── KPI Validation ───────────────────────────────────────────────────────────

/**
 * validateFinancials — enforces invariants and logs any violations.
 * Returns corrected summary (safe fallback = zeros) if invariants fail.
 */
export function validateFinancials(s: FinancialSummary): FinancialSummary {
  const TOLERANCE = 0.02; // 2 cents rounding tolerance

  // Invariant 1: Revenue ≥ 0
  if (s.revenue < 0) {
    console.error('[calcEngine] INVARIANT VIOLATION: Revenue is negative', s);
    return safeZeroSummary();
  }

  // Invariant 2: COGS ≥ 0
  if (s.cogs < 0) {
    console.error('[calcEngine] INVARIANT VIOLATION: COGS is negative', s);
    return safeZeroSummary();
  }

  // Invariant 3: Revenue = Gross Profit + COGS (within tolerance)
  const revenueCheck = Math.abs(s.revenue - (s.grossProfit + s.cogs));
  if (revenueCheck > TOLERANCE && s.revenue > 0) {
    console.error(
      `[calcEngine] INVARIANT VIOLATION: Revenue (${s.revenue}) ≠ GrossProfit (${s.grossProfit}) + COGS (${s.cogs}). Diff=${revenueCheck}`,
      s,
    );
    // Self-heal: recompute gross profit from revenue - cogs
    const healed: FinancialSummary = {
      ...s,
      grossProfit: s.revenue - s.cogs,
      netProfit: s.revenue - s.cogs,
      marginPct: s.revenue > 0 ? ((s.revenue - s.cogs) / s.revenue) * 100 : 0,
    };
    return healed;
  }

  // Invariant 4: Gross Profit cannot exceed Revenue
  if (s.grossProfit > s.revenue + TOLERANCE) {
    console.error('[calcEngine] INVARIANT VIOLATION: Gross Profit exceeds Revenue', s);
    return safeZeroSummary();
  }

  // Invariant 5: Margin must be 0–100%
  if (s.marginPct < -0.1 || s.marginPct > 100.1) {
    console.error('[calcEngine] INVARIANT VIOLATION: Margin out of range', s);
    return {
      ...s,
      marginPct: s.revenue > 0 ? ((s.grossProfit / s.revenue) * 100) : 0,
    };
  }

  return s;
}

function safeZeroSummary(): FinancialSummary {
  return {
    revenue: 0, cogs: 0, grossProfit: 0, netProfit: 0,
    marginPct: 0, transactionCount: 0, avgOrderValue: 0,
    totalDiscount: 0, totalTax: 0,
  };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function monthRange(): { start: string; end: string } {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function yearRange(): { start: string; end: string } {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function lastNDaysRange(n: number): { start: string; end: string } {
  const end   = new Date();
  const start = new Date(end.getTime() - n * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function last6MonthsRange(): { start: string; end: string } {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return { start: start.toISOString(), end: now.toISOString() };
}

/** Generate bucket labels for period charts */
export function buildBuckets(
  type: 'daily' | 'weekly' | 'monthly' | 'last6months',
): { key: string; label: string }[] {
  const now = new Date();
  if (type === 'daily') {
    return Array.from({ length: 14 }, (_, i) => {
      const h = 7 + i;
      return { key: String(h).padStart(2, '0'), label: `${h}:00` };
    });
  }
  if (type === 'weekly') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 24 * 3600 * 1000);
      return {
        key: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      };
    });
  }
  if (type === 'monthly') {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.min(days, now.getDate()) }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
      return { key: d.toISOString().split('T')[0], label: String(i + 1) };
    });
  }
  // last6months
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
    };
  });
}

// ─── API calls (all call Supabase RPCs) ───────────────────────────────────────

/**
 * getFinancialSummary — calls get_financial_summary RPC.
 * Validates and returns safe values.
 */
export async function getFinancialSummary(
  tenantId: string,
  startAt: string,
  endAt: string,
): Promise<FinancialSummary> {
  const { data, error } = await supabase.rpc('get_financial_summary', {
    p_tenant_id: tenantId,
    p_start_at: startAt,
    p_end_at: endAt,
  });
  if (error) {
    console.error('[calcEngine] get_financial_summary failed', error);
    return safeZeroSummary();
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return safeZeroSummary();

  const summary: FinancialSummary = {
    revenue:          Number(row.revenue)           ?? 0,
    cogs:             Number(row.cogs)              ?? 0,
    grossProfit:      Number(row.gross_profit)      ?? 0,
    netProfit:        Number(row.net_profit)        ?? 0,
    marginPct:        Number(row.margin_pct)        ?? 0,
    transactionCount: Number(row.transaction_count) ?? 0,
    avgOrderValue:    Number(row.avg_order_value)   ?? 0,
    totalDiscount:    Number(row.total_discount)    ?? 0,
    totalTax:         Number(row.total_tax)         ?? 0,
  };
  return validateFinancials(summary);
}

/**
 * getFinancialSummaryByPeriod — calls get_financial_summary_by_period RPC.
 * Merges RPC rows with bucket labels for chart data.
 */
export async function getFinancialSummaryByPeriod(
  tenantId: string,
  startAt: string,
  endAt: string,
  period: CalcPeriod,
  buckets: { key: string; label: string }[],
): Promise<PeriodRow[]> {
  const { data, error } = await supabase.rpc('get_financial_summary_by_period', {
    p_tenant_id: tenantId,
    p_start_at:  startAt,
    p_end_at:    endAt,
    p_period:    period,
  });
  if (error) {
    console.error('[calcEngine] get_financial_summary_by_period failed', error);
    return buckets.map(b => ({ periodKey: b.key, revenue: 0, cogs: 0, grossProfit: 0, orders: 0, discount: 0, tax: 0, marginPct: 0 }));
  }
  const rows: PeriodRow[] = [];
  const rpcMap = new Map<string, typeof data[0]>(
    (data ?? []).map((r: { period_key: string }) => [r.period_key, r]),
  );
  for (const b of buckets) {
    const r = rpcMap.get(b.key);
    const rev  = Number(r?.revenue     ?? 0);
    const cogs = Number(r?.cogs        ?? 0);
    const gp   = Number(r?.gross_profit ?? rev - cogs);
    rows.push({
      periodKey:   b.label,
      revenue:     rev,
      cogs,
      grossProfit: gp,
      orders:      Number(r?.orders   ?? 0),
      discount:    Number(r?.discount ?? 0),
      tax:         Number(r?.tax      ?? 0),
      marginPct:   rev > 0 ? (gp / rev) * 100 : 0,
    });
  }
  return rows;
}

/** getInventoryValue — calls get_inventory_value RPC */
export async function getInventoryValue(tenantId: string): Promise<InventorySummary> {
  const { data, error } = await supabase.rpc('get_inventory_value', {
    p_tenant_id: tenantId,
  });
  if (error) {
    console.error('[calcEngine] get_inventory_value failed', error);
    return { totalValue: 0, lowStockCount: 0, outOfStock: 0, totalSkuCount: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    totalValue:     Number(row?.total_value     ?? 0),
    lowStockCount:  Number(row?.low_stock_count ?? 0),
    outOfStock:     Number(row?.out_of_stock    ?? 0),
    totalSkuCount:  Number(row?.total_sku_count ?? 0),
  };
}

/** getTopProducts — calls get_top_products RPC */
export async function getTopProducts(
  tenantId: string,
  startAt: string,
  endAt: string,
  limit = 5,
): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc('get_top_products', {
    p_tenant_id: tenantId,
    p_start_at:  startAt,
    p_end_at:    endAt,
    p_limit:     limit,
  });
  if (error) {
    console.error('[calcEngine] get_top_products failed', error);
    return [];
  }
  return (data ?? []).map((r: {
    product_id: string; product_name: string;
    qty_sold: string; revenue: string; cogs: string; gross_profit: string;
  }) => {
    const rev = Number(r.revenue ?? 0);
    const gp  = Number(r.gross_profit ?? 0);
    return {
      productId:   r.product_id,
      productName: r.product_name,
      qtySold:     Number(r.qty_sold ?? 0),
      revenue:     rev,
      cogs:        Number(r.cogs ?? 0),
      grossProfit: gp,
      marginPct:   rev > 0 ? (gp / rev) * 100 : 0,
    };
  });
}

/** getCategoryRevenue — calls get_category_revenue RPC */
export async function getCategoryRevenue(
  tenantId: string,
  startAt: string,
  endAt: string,
): Promise<CategoryRevenue[]> {
  const { data, error } = await supabase.rpc('get_category_revenue', {
    p_tenant_id: tenantId,
    p_start_at:  startAt,
    p_end_at:    endAt,
  });
  if (error) {
    console.error('[calcEngine] get_category_revenue failed', error);
    return [];
  }
  return (data ?? []).map((r: { category_name: string; revenue: string; orders: string }) => ({
    categoryName: r.category_name,
    revenue:      Number(r.revenue ?? 0),
    orders:       Number(r.orders  ?? 0),
  }));
}

/** getCashierShiftSummary — calls get_cashier_shift_summary RPC */
export async function getCashierShiftSummary(
  cashierId: string,
  tenantId: string,
  startAt: string,
  endAt: string,
): Promise<CashierShiftSummary> {
  const { data, error } = await supabase.rpc('get_cashier_shift_summary', {
    p_cashier_id: cashierId,
    p_tenant_id:  tenantId,
    p_start_at:   startAt,
    p_end_at:     endAt,
  });
  if (error) {
    console.error('[calcEngine] get_cashier_shift_summary failed', error);
    return { revenue: 0, transactionCount: 0, avgOrderValue: 0, itemsSold: 0, uniqueCustomers: 0, refundCount: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    revenue:           Number(row?.revenue            ?? 0),
    transactionCount:  Number(row?.transaction_count  ?? 0),
    avgOrderValue:     Number(row?.avg_order_value    ?? 0),
    itemsSold:         Number(row?.items_sold         ?? 0),
    uniqueCustomers:   Number(row?.unique_customers   ?? 0),
    refundCount:       Number(row?.refund_count       ?? 0),
  };
}
