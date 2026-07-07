<<<<<<< HEAD
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, ShoppingBag, TrendingUp, Users, Package,
  AlertTriangle, UserPlus, BarChart3, RefreshCw,
  TrendingDown, Star, Boxes,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import { toast } from 'sonner';
import {
  getFinancialSummary,
  getFinancialSummaryByPeriod,
  getInventoryValue,
  getTopProducts,
  getCategoryRevenue,
  buildBuckets,
  todayRange,
  monthRange,
  yearRange,
  last6MonthsRange,
  type FinancialSummary,
  type InventorySummary,
  type TopProduct,
  type CategoryRevenue,
  type PeriodRow,
} from '@/services/calcEngine';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
];

interface DashStats {
  todaySummary: FinancialSummary;
  monthlySales: number;
  annualSales: number;
  totalCustomers: number;
  newCustomers: number;
  inventory: InventorySummary;
  activeStaff: number;
  topProductName: string;
  topCategoryName: string;
=======
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/useCurrency';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ComposedChart,
} from 'recharts';
import {
  DollarSign, ShoppingBag, TrendingUp, Package, ArrowUpRight, AlertTriangle, BarChart3,
  TrendingDown, Percent,
} from 'lucide-react';
import { getCachedProducts, cacheProducts, getCachedSalesHistory, cacheSalesHistory, historyWindowStartISO } from '@/lib/offlineDb';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#334155', fontSize: 12 };
const CHART_COLORS = ['#2563EB', '#7C3AED', '#16A34A', '#D97706', '#EF4444'];

interface Sale {
  id: string;
  total_amount: number;
  subtotal: number;
  cogs_amount: number;
  profit_amount: number;
  cashier_id: string;
  payment_method: string;
  receipt_number: string;
  created_at: string;
}
interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  stock: number;
  price: number;
  buying_cost: number;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = Array.from({ length: 12 }, (_, i) => {
  const h = 8 + i;
  return { label: h <= 12 ? `${h}am` : `${h - 12}pm`, h };
});

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d: Date) { const x = startOfDay(d); x.setDate(1); return x; }

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(v => { clearTimeout(timer); resolve(v); }, () => { clearTimeout(timer); resolve(fallback); });
  });
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
}

export default function OWOverview() {
  const { appUser } = useAuth();
<<<<<<< HEAD
  const cc = appUser?.currency_code ?? 'KES';
  const tenantId = appUser?.tenant_id ?? '';

  const [stats,       setStats]       = useState<DashStats | null>(null);
  const [dailyData,   setDailyData]   = useState<PeriodRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<PeriodRow[]>([]);
  const [catData,     setCatData]     = useState<CategoryRevenue[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [payMethods,  setPayMethods]  = useState<{ name: string; value: number }[]>([]);
  const [custGrowth,  setCustGrowth]  = useState<{ month: string; customers: number }[]>([]);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const now = new Date();

      // Date ranges
      const todayR  = todayRange();
      const monthR  = monthRange();
      const yearR   = yearRange();
      const sixMonR = last6MonthsRange();

      // Chart buckets
      const dailyBuckets   = buildBuckets('weekly');   // last 7 days
      const monthlyBuckets = buildBuckets('last6months');

      // ── All data fetched in parallel ──────────────────────────────────
      const [
        todaySummary,
        monthSummary,
        yearSummary,
        inventorySummary,
        topProds,
        catRevenue,
        dailyPeriod,
        monthlyPeriod,
        customersRes,
        staffRes,
        paymentsRes,
        custMonthRes,
      ] = await Promise.all([
        getFinancialSummary(tenantId, todayR.start, todayR.end),
        getFinancialSummary(tenantId, monthR.start, monthR.end),
        getFinancialSummary(tenantId, yearR.start,  yearR.end),
        getInventoryValue(tenantId),
        getTopProducts(tenantId, monthR.start, monthR.end, 5),
        getCategoryRevenue(tenantId, monthR.start, monthR.end),
        getFinancialSummaryByPeriod(tenantId, sixMonR.start, now.toISOString(), 'day', dailyBuckets),
        getFinancialSummaryByPeriod(tenantId, sixMonR.start, now.toISOString(), 'month', monthlyBuckets),
        supabase.from('customers').select('id, created_at').eq('tenant_id', tenantId),
        supabase.from('profiles').select('id, role').eq('tenant_id', tenantId),
        supabase.from('sales').select('payment_method')
          .eq('tenant_id', tenantId).eq('status', 'completed').gte('created_at', monthR.start),
        supabase.from('customers').select('created_at').eq('tenant_id', tenantId)
          .gte('created_at', sixMonR.start),
      ]);

      // Payment methods breakdown
      const pmMap: Record<string, number> = {};
      (paymentsRes.data ?? []).forEach((p: { payment_method: string }) => {
        pmMap[p.payment_method] = (pmMap[p.payment_method] ?? 0) + 1;
      });
      setPayMethods(Object.entries(pmMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value,
      })));

      // Customer growth (cumulative over 6 months)
      const cmMap: Record<string, number> = {};
      monthlyBuckets.forEach(b => { cmMap[b.key] = 0; });
      (custMonthRes.data ?? []).forEach((c: { created_at: string }) => {
        const key = c.created_at.substring(0, 7);
        if (cmMap[key] !== undefined) cmMap[key]++;
      });
      let cum = 0;
      setCustGrowth(monthlyBuckets.map(b => {
        cum += cmMap[b.key] ?? 0;
        return { month: b.label, customers: cum };
      }));

      const customers  = customersRes.data ?? [];
      const staff      = staffRes.data     ?? [];
      const newCust    = customers.filter(c =>
        new Date(c.created_at) >= new Date(now.getFullYear(), now.getMonth(), 1)
      ).length;

      setDailyData(dailyPeriod);
      setMonthlyData(monthlyPeriod);
      setCatData(catRevenue);
      setTopProducts(topProds);

      setStats({
        todaySummary,
        monthlySales:    monthSummary.revenue,
        annualSales:     yearSummary.revenue,
        totalCustomers:  customers.length,
        newCustomers:    newCust,
        inventory:       inventorySummary,
        activeStaff:     staff.filter(s => s.role === 'cashier').length,
        topProductName:  topProds[0]?.productName ?? '—',
        topCategoryName: catRevenue[0]?.categoryName ?? '—',
      });
    } catch (err) {
      toast.error('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const kpis = stats ? [
    { label: "Today's Revenue",   value: formatCurrencyCompact(stats.todaySummary.revenue, cc),           sub: `${stats.todaySummary.transactionCount} orders`,     icon: DollarSign,  color: 'text-blue-600' },
    { label: 'Monthly Revenue',   value: formatCurrencyCompact(stats.monthlySales, cc),                    sub: 'This month',                                         icon: TrendingUp,  color: 'text-emerald-600' },
    { label: 'Annual Revenue',    value: formatCurrencyCompact(stats.annualSales, cc),                     sub: 'Year to date',                                       icon: BarChart3,   color: 'text-violet-600' },
    { label: 'Gross Profit',      value: formatCurrencyCompact(stats.todaySummary.grossProfit, cc),        sub: `${stats.todaySummary.marginPct.toFixed(1)}% margin`, icon: TrendingUp,  color: 'text-green-600' },
    { label: 'Today COGS',        value: formatCurrencyCompact(stats.todaySummary.cogs, cc),               sub: 'Cost of goods sold',                                 icon: DollarSign,  color: 'text-sky-600' },
    { label: 'Total Orders',      value: stats.todaySummary.transactionCount.toString(),                   sub: 'Today completed',                                    icon: ShoppingBag, color: 'text-indigo-600' },
    { label: 'Avg Order Value',   value: formatCurrencyCompact(stats.todaySummary.avgOrderValue, cc),      sub: 'Per transaction',                                    icon: TrendingUp,  color: 'text-pink-600' },
    { label: 'Total Customers',   value: stats.totalCustomers.toString(),                                  sub: `+${stats.newCustomers} this month`,                  icon: Users,       color: 'text-amber-600' },
    { label: 'Inventory Value',   value: formatCurrencyCompact(stats.inventory.totalValue, cc),            sub: `${stats.inventory.totalSkuCount} SKUs`,              icon: Package,     color: 'text-teal-600' },
    { label: 'Low Stock',         value: stats.inventory.lowStockCount.toString(),                        sub: 'Need reorder',                                       icon: AlertTriangle, color: 'text-orange-500' },
    { label: 'Out of Stock',      value: stats.inventory.outOfStock.toString(),                           sub: 'Zero quantity',                                      icon: TrendingDown, color: 'text-red-500' },
    { label: 'Active Staff',      value: stats.activeStaff.toString(),                                    sub: 'Cashiers',                                           icon: UserPlus,    color: 'text-cyan-600' },
    { label: 'Top Product',       value: stats.topProductName.substring(0, 16),                           sub: 'By revenue this month',                              icon: Star,        color: 'text-yellow-600' },
    { label: 'Top Category',      value: stats.topCategoryName.substring(0, 16),                         sub: 'By revenue',                                         icon: Boxes,       color: 'text-lime-600' },
    { label: 'New Customers',     value: stats.newCustomers.toString(),                                   sub: 'This month',                                         icon: UserPlus,    color: 'text-rose-600' },
    { label: 'Profit Margin',     value: `${stats.todaySummary.marginPct.toFixed(1)}%`,                  sub: 'Gross / Revenue today',                              icon: TrendingUp,  color: 'text-blue-500' },
  ] : [];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Business Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time performance metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* 16-KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} className="h-24 bg-muted rounded-lg" />)
          : kpis.map(k => (
            <div key={k.label} className="kpi-card">
              <div className="flex items-center justify-between">
                <k.icon className={`w-4 h-4 ${k.color} shrink-0`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-tight">{k.value}</p>
                <p className="text-xs font-medium text-foreground mt-0.5 text-balance leading-snug">{k.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
            </div>
          ))}
      </div>

      {/* Charts row 1: daily trend + weekly bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border shadow-card h-full">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Daily Sales Trend (7 days)</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v, cc)} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v, cc), 'Sales']} />
                    <Area type="monotone" dataKey="sales" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#dGrad)" name="Sales" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-card h-full">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Revenue vs Profit (Monthly)</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <ComposedChart data={monthlyData} barSize={14}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v, cc)} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v, cc)]} />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name="Revenue" />
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Profit" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
=======
  const { format: formatAmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [offlineNoData, setOfflineNoData] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [cashierCount, setCashierCount] = useState(0);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    setOfflineNoData(false);

    if (!navigator.onLine) {
      const [cachedSales, cachedProducts] = await Promise.all([
        getCachedSalesHistory(appUser.tenant_id),
        getCachedProducts(appUser.tenant_id),
      ]);
      const monthStart = startOfMonth(new Date());
      setSales((cachedSales as Sale[]).filter(s => new Date(s.created_at) >= monthStart));
      setProducts(cachedProducts as ProductRow[]);
      setCashierCount(0);
      setLoading(false);
      if (cachedSales.length === 0 && cachedProducts.length === 0) setOfflineNoData(true);
      return;
    }

    const monthStart = startOfMonth(new Date()).toISOString();
    const EMPTY: any = { data: null, count: 0 };
    const [salesRes, productsRes, cashiersRes] = await withTimeout(
      Promise.all([
        supabase.from('sales')
          .select('id, total_amount, subtotal, cogs_amount, profit_amount, cashier_id, payment_method, receipt_number, created_at')
          .eq('tenant_id', appUser.tenant_id).eq('status', 'completed')
          .gte('created_at', monthStart).order('created_at', { ascending: false }),
        supabase.from('products').select('id, name, category, stock, price, buying_cost').eq('tenant_id', appUser.tenant_id),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .eq('tenant_id', appUser.tenant_id).eq('role', 'cashier'),
      ]),
      8000,
      [EMPTY, EMPTY, EMPTY]
    );

    setSales((salesRes.data ?? []) as Sale[]);
    setProducts((productsRes.data ?? []) as ProductRow[]);
    setCashierCount(cashiersRes.count ?? 0);
    setLoading(false);

    // Background cache for offline
    const historyStart = historyWindowStartISO();
    supabase.from('sales')
      .select('id, total_amount, subtotal, cogs_amount, profit_amount, cashier_id, payment_method, receipt_number, created_at')
      .eq('tenant_id', appUser.tenant_id).eq('status', 'completed').gte('created_at', historyStart)
      .then(({ data }) => { if (data) cacheSalesHistory(appUser.tenant_id, data).catch(() => {}); });
    cacheProducts(appUser.tenant_id, (productsRes.data ?? []) as ProductRow[]).catch(() => {});
  }, [appUser?.tenant_id]);

  useEffect(() => {
    load();
    window.addEventListener('online', load);
    return () => window.removeEventListener('online', load);
  }, [load]);

  // ── Derived metrics ───────────────────────────────────────────────────────
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart  = startOfWeek(now);

  const todaySales = sales.filter(s => new Date(s.created_at) >= todayStart);
  const weekSales  = sales.filter(s => new Date(s.created_at) >= weekStart);
  const monthSales = sales;

  const sumRevenue  = (arr: Sale[]) => arr.reduce((t, s) => t + (s.total_amount  || 0), 0);
  const sumCOGS     = (arr: Sale[]) => arr.reduce((t, s) => t + (s.cogs_amount   || 0), 0);
  // Use stored profit_amount — avoids revenue=profit when cogs was 0 on old rows
  const sumProfit   = (arr: Sale[]) => arr.reduce((t, s) => t + (s.profit_amount || 0), 0);
  const profitMargin = (arr: Sale[]) => {
    const r = sumRevenue(arr);
    return r === 0 ? 0 : (sumProfit(arr) / r) * 100;
  };

  const todayRevenue  = sumRevenue(todaySales);
  const todayProfit   = sumProfit(todaySales);
  const weekRevenue   = sumRevenue(weekSales);
  const weekProfit    = sumProfit(weekSales);
  const monthRevenue  = sumRevenue(monthSales);
  const monthCOGS     = sumCOGS(monthSales);
  const monthProfit   = sumProfit(monthSales);
  const monthMargin   = profitMargin(monthSales);

  // Warn if any product has no cost set — profit data will be unreliable for those items
  const noCostCount = products.filter(p => (p.buying_cost ?? 0) <= 0).length;

  const LOW_STOCK = 5;
  const lowStockCount = products.filter(p => p.stock <= LOW_STOCK).length;

  // Top 5 profitable products (by price - buying_cost margin × stock sold proxy)
  const topProfitable = products
    .filter(p => p.price > 0 && (p.buying_cost ?? 0) > 0)
    .map(p => ({ name: p.name, margin: p.price - p.buying_cost, marginPct: p.price > 0 ? ((p.price - p.buying_cost) / p.price) * 100 : 0 }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  // KPI cards
  const KPIs = [
    { label: "Today's Revenue",    value: formatAmt(todayRevenue),            sub: `${todaySales.length} transactions`, icon: DollarSign,   color: '#2563EB' },
    { label: "Today's Profit",     value: formatAmt(todayProfit),             sub: `COGS: ${formatAmt(sumCOGS(todaySales))}`, icon: TrendingUp, color: '#16A34A' },
    { label: 'Weekly Revenue',     value: formatAmt(weekRevenue),             sub: `${weekSales.length} transactions`, icon: ShoppingBag,  color: '#7C3AED' },
    { label: 'Weekly Profit',      value: formatAmt(weekProfit),              sub: profitMargin(weekSales).toFixed(1) + '% margin', icon: TrendingUp, color: '#059669' },
    { label: 'Monthly Revenue',    value: formatAmt(monthRevenue),            sub: `${monthSales.length} sales`, icon: BarChart3,    color: '#D97706' },
    { label: 'Monthly COGS',       value: formatAmt(monthCOGS),               sub: 'Cost of goods sold', icon: TrendingDown, color: '#EF4444' },
    { label: 'Gross Profit (Mo.)', value: formatAmt(monthProfit),             sub: monthMargin.toFixed(1) + '% margin', icon: Percent,     color: '#0EA5E9' },
    { label: 'Inventory Value',    value: formatAmt(products.reduce((t, p) => t + (p.buying_cost > 0 ? p.buying_cost : p.price) * p.stock, 0)), sub: `${products.length} products (at cost)`, icon: Package, color: '#6366F1' },
    { label: 'Low Stock Items',    value: String(lowStockCount),              sub: lowStockCount > 0 ? 'Needs reorder' : 'All stocked', icon: AlertTriangle, color: '#EF4444' },
    { label: 'Active Cashiers',    value: String(cashierCount),               sub: 'on your team', icon: DollarSign, color: '#16A34A' },
  ];

  // Hourly sales + profit today
  const hourlyChart = HOUR_LABELS.map(({ label, h }) => {
    const daySlice = todaySales.filter(s => new Date(s.created_at).getHours() === h);
    return { h: label, revenue: sumRevenue(daySlice), profit: sumProfit(daySlice) };
  });

  // Daily revenue vs profit — last 7 days
  const weeklyChart = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(todayStart); d.setDate(d.getDate() - (6 - i));
    const end = new Date(d); end.setDate(end.getDate() + 1);
    const slice = sales.filter(s => { const t = new Date(s.created_at); return t >= d && t < end; });
    return { day: WEEKDAY_LABELS[d.getDay()], revenue: sumRevenue(slice), profit: sumProfit(slice) };
  });

  // Payment method breakdown
  const payMap: Record<string, number> = {};
  monthSales.forEach(s => { payMap[s.payment_method] = (payMap[s.payment_method] || 0) + (s.total_amount || 0); });
  const payBreakdown = Object.entries(payMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const recentTxns = sales.slice(0, 6);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (offlineNoData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
        <p className="text-sm font-medium text-slate-600">You're offline</p>
        <p className="text-xs text-slate-400 max-w-xs">No cached data yet. Open the dashboard once while online to enable offline viewing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Business Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Revenue, profit, and performance analytics</p>
        </div>
        {navigator.onLine
          ? <Badge className="text-xs border shrink-0" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#16A34A' }}>Live</Badge>
          : <Badge className="text-xs border shrink-0" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#D97706' }}>Offline — cached</Badge>}
      </div>

      {/* Missing cost warning */}
      {noCostCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border px-4 py-3" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{noCostCount} product{noCostCount > 1 ? 's' : ''}</strong> {noCostCount > 1 ? 'have' : 'has'} no buying cost set.
            Profit and COGS figures for those items will be inaccurate.{' '}
            <span className="underline cursor-pointer" onClick={() => {}}>Go to Products to fix them.</span>
          </p>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KPIs.map(k => (
          <Card key={k.label} className="border hover-lift" style={CARD_STYLE}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${k.color}20`, border: `1px solid ${k.color}33` }}>
                  <k.icon className="w-4 h-4" style={{ color: k.color }} />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <p className="text-xl font-bold text-slate-900 leading-tight">{k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              <p className="text-xs mt-1" style={{ color: k.label === 'Low Stock Items' && lowStockCount > 0 ? '#EF4444' : '#16A34A' }}>{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue vs Profit charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Revenue vs Profit — Today (Hourly)</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={hourlyChart}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="h" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => formatAmt(v)} width={60} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatAmt(v), name === 'revenue' ? 'Revenue' : 'Profit']} />
                <Legend formatter={v => <span style={{ color: '#64748B', fontSize: 11 }}>{v === 'revenue' ? 'Revenue' : 'Profit'}</span>} />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGrad)" name="revenue" />
                <Line type="monotone" dataKey="profit" stroke="#16A34A" strokeWidth={2} dot={false} name="profit" />
              </ComposedChart>
            </ResponsiveContainer>
            {todaySales.length === 0 && <p className="text-center text-xs text-slate-400 -mt-2">No sales recorded today yet</p>}
          </CardContent>
        </Card>

        <Card className="border" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Revenue vs Profit — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyChart} barGap={2}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => formatAmt(v)} width={60} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatAmt(v), name === 'revenue' ? 'Revenue' : 'Profit']} />
                <Legend formatter={v => <span style={{ color: '#64748B', fontSize: 11 }}>{v === 'revenue' ? 'Revenue' : 'Profit'}</span>} />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={14} name="revenue" />
                <Bar dataKey="profit"  fill="#16A34A" radius={[4, 4, 0, 0]} barSize={14} name="profit" />
              </BarChart>
            </ResponsiveContainer>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
          </CardContent>
        </Card>
      </div>

<<<<<<< HEAD
      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border shadow-card h-full">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Sales by Category</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-card h-full">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Payment Method Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={payMethods.length ? payMethods : [{ name: 'No data', value: 1 }]}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {(payMethods.length ? payMethods : [{ name: 'No data', value: 1 }])
                        .map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border shadow-card h-full">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : topProducts.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No sales data yet</div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={topProducts} layout="vertical" barSize={16}>
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v, cc)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v, cc), 'Revenue']} />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
=======
      {/* Top profitable products + payment breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="border xl:col-span-2" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Top Profitable Products (by Unit Margin)</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {topProfitable.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Add buying costs to products to see profitability</p>
            ) : (
              <div className="space-y-3">
                {topProfitable.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, p.marginPct)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatAmt(p.margin)}</p>
                      <p className="text-xs text-slate-400">{p.marginPct.toFixed(1)}% margin</p>
                    </div>
                  </div>
                ))}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </div>
            )}
          </CardContent>
        </Card>

<<<<<<< HEAD
        <Card className="border border-border shadow-card h-full">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Customer Growth</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={custGrowth}>
                    <defs>
                      <linearGradient id="cgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--chart-3))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="customers" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#cgGrad)" name="Customers" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
=======
        <Card className="border" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Sales by Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {payBreakdown.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-xs text-slate-400">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={payBreakdown} cx="50%" cy="45%" outerRadius={70} innerRadius={35} dataKey="value" paddingAngle={3}>
                    {payBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatAmt(v), '']} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: '#64748B', fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
            )}
          </CardContent>
        </Card>
      </div>
<<<<<<< HEAD
    </div>
  );
}
=======

      {/* Monthly P&L summary */}
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">Monthly P&amp;L Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: formatAmt(monthRevenue), color: '#2563EB' },
              { label: 'Total COGS',    value: formatAmt(monthCOGS),   color: '#EF4444' },
              { label: 'Gross Profit',  value: formatAmt(monthProfit), color: '#16A34A' },
              { label: 'Profit Margin', value: monthMargin.toFixed(1) + '%', color: monthMargin >= 20 ? '#16A34A' : monthMargin >= 10 ? '#D97706' : '#EF4444' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4 border" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Receipt #', 'Revenue', 'Profit', 'Method', 'Time'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTxns.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No transactions yet</td></tr>
                ) : recentTxns.map(t => {
                  const txProfit = t.profit_amount ?? ((t.total_amount || 0) - (t.cogs_amount || 0));
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-blue-600 whitespace-nowrap">{t.receipt_number || t.id.slice(0, 8)}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap font-mono">{formatAmt(t.total_amount || 0)}</td>
                      <td className="px-5 py-3 text-sm font-semibold whitespace-nowrap font-mono" style={{ color: txProfit >= 0 ? '#16A34A' : '#EF4444' }}>{formatAmt(txProfit)}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge className="text-xs border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>{t.payment_method}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
