import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { ShoppingBag, DollarSign, Clock, TrendingUp, RefreshCw, Package, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
];

interface ShiftStats {
  todaySales: number; ordersServed: number; avgSale: number;
  productsSold: number; customersServed: number; refunds: number; shiftDuration: string;
}

export default function CAOverview() {
  const { appUser } = useAuth();
  const cc = appUser?.currency_code ?? 'KES';
  const cashierId = appUser?.id ?? '';
  const tenantId  = appUser?.tenant_id ?? '';

  const [stats,       setStats]       = useState<ShiftStats | null>(null);
  const [hourlyData,  setHourlyData]  = useState<{ h: string; sales: number; txn: number }[]>([]);
  const [payMethods,  setPayMethods]  = useState<{ name: string; value: number }[]>([]);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    if (!cashierId) return;
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [salesRes, refundsRes] = await Promise.all([
        supabase.from('sales')
          .select('id, total_amount, payment_method, customer_id, created_at')
          .eq('cashier_id', cashierId)
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .gte('created_at', todayStart.toISOString()),
        supabase.from('sales')
          .select('id')
          .eq('cashier_id', cashierId)
          .eq('tenant_id', tenantId)
          .eq('status', 'refunded')
          .gte('created_at', todayStart.toISOString()),
      ]);

      const sales   = salesRes.data   ?? [];
      const refunds = refundsRes.data ?? [];

      const todaySales  = sales.reduce((s, x) => s + x.total_amount, 0);
      const ordersServed = sales.length;
      const avgSale     = ordersServed > 0 ? todaySales / ordersServed : 0;
      const customersServed = new Set(sales.map(s => s.customer_id).filter(Boolean)).size;

      // Products sold — count from sale_items
      const saleIds = sales.map(s => s.id);
      let productsSold = 0;
      if (saleIds.length > 0) {
        const { data: items } = await supabase.from('sale_items')
          .select('quantity').in('sale_id', saleIds);
        productsSold = (items ?? []).reduce((s, i) => s + i.quantity, 0);
      }

      // Hourly data
      const hMap: Record<number, { sales: number; txn: number }> = {};
      for (let h = 7; h <= 20; h++) hMap[h] = { sales: 0, txn: 0 };
      sales.forEach(s => {
        const h = new Date(s.created_at).getHours();
        if (hMap[h]) { hMap[h].sales += s.total_amount; hMap[h].txn++; }
      });
      setHourlyData(Object.entries(hMap).map(([h, v]) => ({
        h: `${h}:00`,
        sales: v.sales,
        txn: v.txn,
      })));

      // Payment methods
      const pmMap: Record<string, number> = {};
      sales.forEach(s => { pmMap[s.payment_method] = (pmMap[s.payment_method] ?? 0) + 1; });
      setPayMethods(Object.entries(pmMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value,
      })));

      // Shift duration
      const clockIn = todayStart;
      const elapsed = Math.floor((Date.now() - clockIn.getTime()) / 60000);
      const shiftDuration = `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`;

      setStats({ todaySales, ordersServed, avgSale, productsSold, customersServed, refunds: refunds.length, shiftDuration });
    } catch (err) {
      toast.error('Failed to load shift data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cashierId, tenantId]);

  useEffect(() => { load(); }, [load]);

  const kpis = stats ? [
    { label: "Today's Sales",    value: formatCurrencyCompact(stats.todaySales, cc), sub: 'Total shift revenue',   icon: DollarSign,  color: 'text-blue-600' },
    { label: 'Orders Served',    value: stats.ordersServed.toString(),               sub: 'Completed transactions', icon: ShoppingBag, color: 'text-emerald-600' },
    { label: 'Average Sale',     value: formatCurrencyCompact(stats.avgSale, cc),    sub: 'Per transaction',        icon: TrendingUp,  color: 'text-violet-600' },
    { label: 'Products Sold',    value: stats.productsSold.toString(),               sub: 'Units today',            icon: Package,     color: 'text-amber-600' },
    { label: 'Customers Served', value: stats.customersServed.toString(),            sub: 'Unique customers',       icon: Users,       color: 'text-sky-600' },
    { label: 'Refunds',          value: stats.refunds.toString(),                   sub: 'Today',                  icon: TrendingUp,  color: 'text-red-500' },
    { label: 'Shift Duration',   value: stats.shiftDuration,                        sub: 'Clocked in at 07:00',    icon: Clock,       color: 'text-indigo-600' },
    { label: 'Shift Sales',      value: formatCurrencyCompact(stats.todaySales, cc), sub: 'Same as today',          icon: DollarSign,  color: 'text-teal-600' },
  ] : [];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Shift Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your performance today — {appUser?.username ?? 'Cashier'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 bg-muted rounded-lg" />)
          : kpis.map(k => (
            <div key={k.label} className="kpi-card">
              <k.icon className={`w-4 h-4 ${k.color} shrink-0`} />
              <div>
                <p className="text-xl font-bold text-foreground">{k.value}</p>
                <p className="text-xs font-medium text-foreground mt-0.5 text-balance">{k.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
            </div>
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border shadow-card h-full">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Hourly Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={hourlyData} barSize={18}>
                    <XAxis dataKey="h" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v, cc)} />
                    <Tooltip formatter={(v: number, name: string) => [
                      name === 'sales' ? formatCurrency(v, cc) : v,
                      name === 'sales' ? 'Revenue' : 'Orders',
                    ]} />
                    <Bar dataKey="sales" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name="sales" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-card h-full">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : payMethods.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No sales yet today</div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={payMethods} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {payMethods.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
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

      {/* Hourly transactions trend */}
      <Card className="border border-border shadow-card">
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-balance">Sales Trend (Today)</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? <Skeleton className="h-44 bg-muted" /> : (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="shiftGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--chart-2))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="h" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Transactions']} />
                  <Area type="monotone" dataKey="txn" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#shiftGrad)" name="Transactions" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
