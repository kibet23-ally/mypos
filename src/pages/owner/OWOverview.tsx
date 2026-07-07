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
}

export default function OWOverview() {
  const { appUser } = useAuth();
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
          </CardContent>
        </Card>
      </div>

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
              </div>
            )}
          </CardContent>
        </Card>

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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
