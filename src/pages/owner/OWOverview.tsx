import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, TrendingUp, ShoppingBag, Users,
  RefreshCw, Package, AlertTriangle, XCircle, ArrowUpRight, ArrowDownRight,
  ScanBarcode, UserPlus, FileText, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardNav } from '@/contexts/DashboardNavContext';
import { supabase } from '@/db/supabase';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import {
  getFinancialSummary,
  getFinancialSummaryByPeriod,
  getInventoryValue,
  getTopProducts,
  buildBuckets,
  todayRange,
  lastNDaysRange,
  last6MonthsRange,
  type FinancialSummary,
  type InventorySummary,
  type TopProduct,
  type PeriodRow,
} from '@/services/calcEngine';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))',
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', mobile: 'M-Pesa', mpesa: 'M-Pesa', card: 'Card',
  bank_transfer: 'Bank', bank: 'Bank',
};

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
  refunded:  'bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]',
  pending:   'bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]',
};

function yesterdayRange() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(startToday); start.setDate(start.getDate() - 1);
  return { start: start.toISOString(), end: startToday.toISOString() };
}

/** Tiny inline trend sparkline for a KPI card — no axes, no tooltip. */
function Sparkline({ data, dataKey, color }: { data: PeriodRow[]; dataKey: 'revenue' | 'grossProfit'; color: string }) {
  if (data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#spark-${dataKey})`} isAnimationActive />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface RecentSale {
  id: string;
  receiptNumber: string;
  customerName: string;
  paymentMethod: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function OWOverview() {
  const { appUser } = useAuth();
  const { navigate } = useDashboardNav();
  const cc = appUser?.currency_code ?? 'KES';
  const tenantId = appUser?.tenant_id ?? '';

  const [today,       setToday]       = useState<FinancialSummary | null>(null);
  const [yesterday,   setYesterday]   = useState<FinancialSummary | null>(null);
  const [inventory,   setInventory]   = useState<InventorySummary | null>(null);
  const [dailyData,   setDailyData]   = useState<PeriodRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [payMethods,  setPayMethods]  = useState<{ name: string; value: number }[]>([]);
  const [custGrowth,  setCustGrowth]  = useState<{ month: string; customers: number }[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [custToday,   setCustToday]   = useState({ served: 0, new: 0 });
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const now       = new Date();
      const todayR    = todayRange();
      const yestR     = yesterdayRange();
      const sevenDayR = lastNDaysRange(7);
      const sixMonR   = last6MonthsRange();
      const dailyBuckets   = buildBuckets('weekly');
      const monthlyBuckets = buildBuckets('last6months');

      const [
        todaySummary, yesterdaySummary, inventorySummary, topProds, dailyPeriod,
        paymentsRes, custMonthRes, salesTodayRes, newCustTodayRes, recentSalesRes,
      ] = await Promise.all([
        getFinancialSummary(tenantId, todayR.start, todayR.end),
        getFinancialSummary(tenantId, yestR.start, yestR.end),
        getInventoryValue(tenantId),
        getTopProducts(tenantId, sixMonR.start, now.toISOString(), 5),
        getFinancialSummaryByPeriod(tenantId, sevenDayR.start, now.toISOString(), 'day', dailyBuckets),
        supabase.from('sales').select('payment_method')
          .eq('tenant_id', tenantId).eq('status', 'completed').gte('created_at', todayR.start),
        supabase.from('customers').select('created_at').eq('tenant_id', tenantId).gte('created_at', sixMonR.start),
        supabase.from('sales').select('customer_id')
          .eq('tenant_id', tenantId).eq('status', 'completed')
          .gte('created_at', todayR.start).not('customer_id', 'is', null),
        supabase.from('customers').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).gte('created_at', todayR.start),
        supabase.from('sales')
          .select('id, receipt_number, total_amount, payment_method, status, created_at, customers(name)')
          .eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
      ]);

      // Payment methods breakdown (today)
      const pmMap: Record<string, number> = {};
      (paymentsRes.data ?? []).forEach((p: { payment_method: string }) => {
        const label = PAYMENT_LABELS[p.payment_method] ?? (p.payment_method?.charAt(0).toUpperCase() + p.payment_method?.slice(1));
        pmMap[label] = (pmMap[label] ?? 0) + 1;
      });
      setPayMethods(Object.entries(pmMap).map(([name, value]) => ({ name, value })));

      // Customer growth (cumulative, 6 months)
      const cmMap: Record<string, number> = {};
      monthlyBuckets.forEach(b => { cmMap[b.key] = 0; });
      (custMonthRes.data ?? []).forEach((c: { created_at: string }) => {
        const key = c.created_at.substring(0, 7);
        if (cmMap[key] !== undefined) cmMap[key]++;
      });
      let cum = 0;
      setCustGrowth(monthlyBuckets.map(b => { cum += cmMap[b.key] ?? 0; return { month: b.label, customers: cum }; }));

      // Distinct customers served today
      const distinctToday = new Set((salesTodayRes.data ?? []).map((s: { customer_id: string }) => s.customer_id));

      // Recent sales
      setRecentSales((recentSalesRes.data ?? []).map((s: any) => ({
        id: s.id,
        receiptNumber: s.receipt_number ?? s.id.slice(0, 8),
        customerName: s.customers?.name ?? 'Walk-in',
        paymentMethod: PAYMENT_LABELS[s.payment_method] ?? s.payment_method,
        amount: Number(s.total_amount ?? 0),
        status: s.status,
        createdAt: s.created_at,
      })));

      setDailyData(dailyPeriod);
      setTopProducts(topProds);
      setToday(todaySummary);
      setYesterday(yesterdaySummary);
      setInventory(inventorySummary);
      setCustToday({ served: distinctToday.size, new: newCustTodayRes.count ?? 0 });
    } catch (err) {
      toast.error('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const revenueChangePct = today && yesterday
    ? (yesterday.revenue > 0
        ? ((today.revenue - yesterday.revenue) / yesterday.revenue) * 100
        : (today.revenue > 0 ? 100 : 0))
    : 0;

  const inventoryHealthPct = inventory && inventory.totalSkuCount > 0
    ? Math.round(((inventory.totalSkuCount - inventory.lowStockCount - inventory.outOfStock) / inventory.totalSkuCount) * 100)
    : 100;

  const payMethodTotal = payMethods.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Business Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── 1. Executive KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !today ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl bg-muted" />)
        ) : (
          <>
            {/* Today's Revenue */}
            <div className="kpi-card">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${revenueChangePct >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                  {revenueChangePct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(revenueChangePct).toFixed(1)}%
                </span>
              </div>
              <div>
                <p className="kpi-value">{formatCurrency(today.revenue, cc)}</p>
                <p className="kpi-label mt-0.5">Today's Revenue</p>
              </div>
              <Sparkline data={dailyData} dataKey="revenue" color="hsl(var(--primary))" />
            </div>

            {/* Gross Profit */}
            <div className="kpi-card">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--success)/0.12)] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[hsl(var(--success))]" />
                </div>
              </div>
              <div>
                <p className="kpi-value">{formatCurrency(today.grossProfit, cc)}</p>
                <p className="kpi-label mt-0.5">Gross Profit</p>
                <p className="text-xs font-medium text-[hsl(var(--success))] mt-1">{today.marginPct.toFixed(1)}% margin</p>
              </div>
              <Sparkline data={dailyData} dataKey="grossProfit" color="hsl(var(--success))" />
            </div>

            {/* Orders Today */}
            <div className="kpi-card">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--info)/0.12)] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[hsl(var(--info))]" />
                </div>
              </div>
              <div>
                <p className="kpi-value">{today.transactionCount}</p>
                <p className="kpi-label mt-0.5">Orders Today</p>
                <p className="text-xs text-muted-foreground mt-1">Avg {formatCurrency(today.avgOrderValue, cc)}</p>
              </div>
            </div>

            {/* Customers Today */}
            <div className="kpi-card">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--warning)/0.12)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[hsl(var(--warning))]" />
                </div>
              </div>
              <div>
                <p className="kpi-value">{custToday.served}</p>
                <p className="kpi-label mt-0.5">Customers Today</p>
                <p className="text-xs text-muted-foreground mt-1">+{custToday.new} new</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 2. Revenue Trend (large) + Payment Methods ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-border shadow-card rounded-3xl">
          <CardHeader className="pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-semibold">Revenue Trend — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {loading ? <Skeleton className="h-64 bg-muted rounded-xl" /> : dailyData.every(d => d.revenue === 0) ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No sales in the last 7 days</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="periodKey" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, cc)} width={90} />
                  <Tooltip formatter={(v: number, name: string) => [formatCurrency(v, cc), name]} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#revGrad)" isAnimationActive />
                  <Area type="monotone" dataKey="grossProfit" name="Profit" stroke="hsl(var(--success))" strokeWidth={2.5} fill="url(#profGrad)" isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-card rounded-3xl">
          <CardHeader className="pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-semibold">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {loading ? <Skeleton className="h-64 bg-muted rounded-xl" /> : payMethods.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground text-center">No payments recorded today</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={payMethods} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}
                      dataKey="value" nameKey="name" isAnimationActive
                      label={({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {payMethods.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [`${v} sale${v === 1 ? '' : 's'}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {payMethods.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {p.name}
                      </span>
                      <span className="font-medium text-foreground">{p.value} ({payMethodTotal > 0 ? Math.round((p.value / payMethodTotal) * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Top Products + Inventory Summary ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border shadow-card rounded-3xl">
          <CardHeader className="pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-semibold">Top 5 Products</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {loading ? <Skeleton className="h-56 bg-muted rounded-xl" /> : topProducts.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No sales data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={topProducts} layout="vertical" barSize={16} margin={{ left: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, cc)} />
                  <YAxis type="category" dataKey="productName" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={100}
                    tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + '…' : v} />
                  <Tooltip
                    formatter={(v: number, name: string, p: any) => name === 'revenue' ? [formatCurrency(v, cc), 'Revenue'] : [v, name]}
                    labelFormatter={(_, p) => p?.[0]?.payload?.productName ?? ''}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload as TopProduct;
                      return (
                        <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-elevated text-xs">
                          <p className="font-semibold text-foreground mb-1">{d.productName}</p>
                          <p className="text-muted-foreground">Revenue: <span className="font-medium text-foreground">{formatCurrency(d.revenue, cc)}</span></p>
                          <p className="text-muted-foreground">Sold: <span className="font-medium text-foreground">{d.qtySold} units</span></p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} isAnimationActive />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-card rounded-3xl">
          <CardHeader className="pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-semibold">Inventory Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            {loading || !inventory ? <Skeleton className="h-56 bg-muted rounded-xl" /> : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(inventory.totalValue, cc)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Inventory Value</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{inventory.totalSkuCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total Products</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--warning))]" /> Low Stock</span>
                      <span className="font-semibold text-foreground">{inventory.lowStockCount}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-[hsl(var(--warning))] rounded-full transition-all" style={{ width: `${inventory.totalSkuCount > 0 ? (inventory.lowStockCount / inventory.totalSkuCount) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><XCircle className="w-3.5 h-3.5 text-destructive" /> Out of Stock</span>
                      <span className="font-semibold text-foreground">{inventory.outOfStock}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-destructive rounded-full transition-all" style={{ width: `${inventory.totalSkuCount > 0 ? (inventory.outOfStock / inventory.totalSkuCount) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Healthy Stock</span>
                      <span className="font-semibold text-[hsl(var(--success))]">{inventoryHealthPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-[hsl(var(--success))] rounded-full transition-all" style={{ width: `${inventoryHealthPct}%` }} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Recent Sales + Customer Growth ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border shadow-card rounded-3xl">
          <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Sales</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate('ow-sales-history')}>
              View All <ArrowUpRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {loading ? (
              <div className="space-y-2 px-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 bg-muted rounded-lg" />)}</div>
            ) : recentSales.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No sales yet today</div>
            ) : (
              <div className="divide-y divide-border">
                {recentSales.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.receiptNumber} · {s.paymentMethod} · {new Date(s.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(s.amount, cc)}</p>
                      <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[s.status] ?? 'bg-secondary text-muted-foreground'}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-card rounded-3xl">
          <CardHeader className="pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-semibold">Customer Growth — 6 Months</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {loading ? <Skeleton className="h-56 bg-muted rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={custGrowth}>
                  <defs>
                    <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="customers" name="Customers" stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Quick Actions ────────────────────────────────────────────── */}
      <Card className="border border-border shadow-card rounded-3xl">
        <CardHeader className="pb-2 px-6 pt-6">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'New Sale',       icon: ScanBarcode, key: 'ow-pos' },
              { label: 'Add Product',    icon: Package,     key: 'ow-products' },
              { label: 'Add Customer',   icon: UserPlus,    key: 'ow-customers' },
              { label: 'Create Invoice', icon: FileText,    key: 'ow-invoices' },
              { label: 'View Reports',   icon: BarChart3,   key: 'ow-reports' },
            ].map(a => (
              <button
                key={a.key}
                onClick={() => navigate(a.key)}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 hover:border-primary hover:bg-accent hover:-translate-y-0.5 transition-all duration-150"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <a.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground text-center">{a.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}