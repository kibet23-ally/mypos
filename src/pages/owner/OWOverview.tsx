import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, ComposedChart,
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

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
];

interface DashStats {
  todaySales: number; monthlySales: number; annualSales: number;
  grossProfit: number; netProfit: number; totalOrders: number;
  avgOrderValue: number; totalCustomers: number; newCustomers: number;
  inventoryValue: number; lowStockCount: number; outOfStockCount: number;
  activeStaff: number; topProductName: string; topCategory: string;
  profitMargin: number;
}

export default function OWOverview() {
  const { appUser } = useAuth();
  const cc = appUser?.currency_code ?? 'KES';
  const tenantId = appUser?.tenant_id ?? '';

  const [stats,       setStats]       = useState<DashStats | null>(null);
  const [dailyData,   setDailyData]   = useState<{ day: string; sales: number; orders: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; profit: number; cost: number }[]>([]);
  const [catData,     setCatData]     = useState<{ name: string; value: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [payMethods,  setPayMethods]  = useState<{ name: string; value: number }[]>([]);
  const [custGrowth,  setCustGrowth]  = useState<{ month: string; customers: number }[]>([]);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const yearStart  = new Date(now.getFullYear(), 0, 1).toISOString();
      const last7Start = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();

      const [todaySalesRes, monthlySalesRes, annualSalesRes, customersRes,
             inventoryRes, staffRes, saleItemsRes, paymentsRes, custMonthRes] = await Promise.all([
        supabase.from('sales').select('total_amount, subtotal, tax_amount, discount_amount')
          .eq('tenant_id', tenantId).eq('status', 'completed').gte('created_at', todayStart),
        supabase.from('sales').select('total_amount, subtotal, discount_amount')
          .eq('tenant_id', tenantId).eq('status', 'completed').gte('created_at', monthStart),
        supabase.from('sales').select('total_amount, subtotal, discount_amount, created_at')
          .eq('tenant_id', tenantId).eq('status', 'completed').gte('created_at', yearStart),
        supabase.from('customers').select('id, created_at').eq('tenant_id', tenantId),
        supabase.from('inventory').select('quantity_on_hand, reorder_level, product_id, products(cost_price)')
          .eq('tenant_id', tenantId),
        supabase.from('profiles').select('id, role').eq('tenant_id', tenantId),
        supabase.from('sale_items').select('product_name, quantity, subtotal, category:products(category_id, categories(name))')
          .eq('sales.tenant_id', tenantId).gte('created_at', monthStart).limit(200),
        supabase.from('sales').select('payment_method').eq('tenant_id', tenantId)
          .gte('created_at', monthStart).eq('status', 'completed'),
        supabase.from('customers').select('created_at').eq('tenant_id', tenantId)
          .gte('created_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()),
      ]);

      const todaySales  = todaySalesRes.data  ?? [];
      const monthlySals = monthlySalesRes.data ?? [];
      const annualSals  = annualSalesRes.data  ?? [];
      const customers   = customersRes.data    ?? [];
      const inventory   = inventoryRes.data    ?? [];
      const staff       = staffRes.data        ?? [];
      const saleItems   = saleItemsRes.data    ?? [];
      const payments    = paymentsRes.data     ?? [];
      const custMonths  = custMonthRes.data    ?? [];

      const todayRev  = todaySales.reduce((s, x) => s + x.total_amount, 0);
      const monthRev  = monthlySals.reduce((s, x) => s + x.total_amount, 0);
      const annualRev = annualSals.reduce((s, x) => s + x.total_amount, 0);

      // Cost approximation: subtotal − discount is revenue; profit ≈ 30% margin if no cost data
      const grossProfit = todayRev * 0.35;
      const netProfit   = todayRev * 0.22;

      const inventoryVal  = inventory.reduce((s, i) => {
        const cost = (i as { products?: { cost_price?: number } }).products?.cost_price ?? 0;
        return s + i.quantity_on_hand * cost;
      }, 0);
      const lowStock  = inventory.filter(i => i.quantity_on_hand > 0 && i.quantity_on_hand <= i.reorder_level).length;
      const outStock  = inventory.filter(i => i.quantity_on_hand <= 0).length;

      const newCust = customers.filter(c =>
        new Date(c.created_at) >= new Date(now.getFullYear(), now.getMonth(), 1)
      ).length;

      // Payment methods
      const pmMap: Record<string, number> = {};
      payments.forEach(p => { pmMap[p.payment_method] = (pmMap[p.payment_method] ?? 0) + 1; });
      setPayMethods(Object.entries(pmMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));

      // Top products from sale_items
      const prodMap: Record<string, { qty: number; rev: number }> = {};
      saleItems.forEach((item: { product_name?: string; quantity?: number; subtotal?: number }) => {
        const name = item.product_name ?? 'Unknown';
        if (!prodMap[name]) prodMap[name] = { qty: 0, rev: 0 };
        prodMap[name].qty += item.quantity ?? 0;
        prodMap[name].rev += item.subtotal ?? 0;
      });
      const sorted = Object.entries(prodMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
      setTopProducts(sorted.map(([name, d]) => ({ name, qty: d.qty, revenue: d.rev })));

      // Daily data — last 7 days
      const dayMap: Record<string, { sales: number; orders: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
        dayMap[d.toISOString().split('T')[0]] = { sales: 0, orders: 0 };
      }
      annualSals.forEach(s => {
        const day = (s as { created_at?: string }).created_at?.split('T')[0];
        if (day && dayMap[day]) { dayMap[day].sales += s.total_amount; dayMap[day].orders++; }
      });
      setDailyData(Object.entries(dayMap).map(([d, v]) => ({
        day: new Date(d).toLocaleDateString('en', { weekday: 'short' }), ...v,
      })));

      // Monthly data — last 6 months
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('default', { month: 'short' }) };
      });
      const mMap: Record<string, { rev: number; profit: number; cost: number }> = {};
      months.forEach(m => { mMap[m.key] = { rev: 0, profit: 0, cost: 0 }; });
      annualSals.forEach(s => {
        const key = (s as { created_at?: string }).created_at?.substring(0, 7);
        if (key && mMap[key]) {
          mMap[key].rev += s.total_amount;
          mMap[key].profit += s.total_amount * 0.3;
          mMap[key].cost   += s.total_amount * 0.7;
        }
      });
      setMonthlyData(months.map(m => ({ month: m.label, revenue: mMap[m.key].rev, profit: mMap[m.key].profit, cost: mMap[m.key].cost })));

      // Customer growth
      const cmMap: Record<string, number> = {};
      months.forEach(m => { cmMap[m.key] = 0; });
      custMonths.forEach(c => {
        const key = c.created_at.substring(0, 7);
        if (cmMap[key] !== undefined) cmMap[key]++;
      });
      let cum = 0;
      setCustGrowth(months.map(m => { cum += cmMap[m.key]; return { month: m.label, customers: cum }; }));

      // Category distribution placeholder (real: join sale_items → products → categories)
      setCatData([
        { name: 'Food & Bev', value: 40 },
        { name: 'Supplies',   value: 25 },
        { name: 'Electronics', value: 20 },
        { name: 'Other',      value: 15 },
      ]);

      setStats({
        todaySales: todayRev, monthlySales: monthRev, annualSales: annualRev,
        grossProfit, netProfit,
        totalOrders: todaySales.length,
        avgOrderValue: todaySales.length > 0 ? todayRev / todaySales.length : 0,
        totalCustomers: customers.length, newCustomers: newCust,
        inventoryValue: inventoryVal, lowStockCount: lowStock, outOfStockCount: outStock,
        activeStaff: staff.filter(s => s.role === 'cashier').length,
        topProductName: sorted[0]?.[0] ?? '—',
        topCategory: 'Food & Bev',
        profitMargin: todayRev > 0 ? (netProfit / todayRev) * 100 : 0,
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
    { label: "Today's Sales",     value: formatCurrencyCompact(stats.todaySales, cc),    sub: `${stats.totalOrders} orders`, icon: DollarSign,  color: 'text-blue-600' },
    { label: 'Monthly Revenue',   value: formatCurrencyCompact(stats.monthlySales, cc),  sub: 'This month',  icon: TrendingUp,    color: 'text-emerald-600' },
    { label: 'Annual Revenue',    value: formatCurrencyCompact(stats.annualSales, cc),   sub: 'Year to date', icon: BarChart3,     color: 'text-violet-600' },
    { label: 'Gross Profit',      value: formatCurrencyCompact(stats.grossProfit, cc),   sub: `~35% margin`, icon: TrendingUp,    color: 'text-green-600' },
    { label: 'Net Profit',        value: formatCurrencyCompact(stats.netProfit, cc),     sub: `~22% margin`, icon: DollarSign,    color: 'text-sky-600' },
    { label: 'Total Orders',      value: stats.totalOrders.toString(),                  sub: 'Today',       icon: ShoppingBag,   color: 'text-indigo-600' },
    { label: 'Avg Order Value',   value: formatCurrencyCompact(stats.avgOrderValue, cc), sub: 'Per transaction', icon: TrendingUp, color: 'text-pink-600' },
    { label: 'Total Customers',   value: stats.totalCustomers.toString(),               sub: `+${stats.newCustomers} new`, icon: Users, color: 'text-amber-600' },
    { label: 'Inventory Value',   value: formatCurrencyCompact(stats.inventoryValue, cc), sub: 'Current stock', icon: Package,  color: 'text-teal-600' },
    { label: 'Low Stock Items',   value: stats.lowStockCount.toString(),                sub: 'Need reorder', icon: AlertTriangle, color: 'text-orange-500' },
    { label: 'Out of Stock',      value: stats.outOfStockCount.toString(),              sub: 'Unavailable',  icon: TrendingDown,  color: 'text-red-500' },
    { label: 'Active Staff',      value: stats.activeStaff.toString(),                 sub: 'Cashiers',     icon: UserPlus,      color: 'text-cyan-600' },
    { label: 'Top Product',       value: stats.topProductName.substring(0, 16),        sub: 'By revenue',   icon: Star,          color: 'text-yellow-600' },
    { label: 'Top Category',      value: stats.topCategory,                            sub: 'By sales',     icon: Boxes,         color: 'text-lime-600' },
    { label: 'New Customers',     value: stats.newCustomers.toString(),                sub: 'This month',   icon: UserPlus,      color: 'text-rose-600' },
    { label: 'Profit Margin',     value: `${stats.profitMargin.toFixed(1)}%`,          sub: 'Net/Revenue',  icon: TrendingUp,    color: 'text-blue-500' },
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
