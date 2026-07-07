import { useEffect, useState, useCallback } from 'react';
<<<<<<< HEAD
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
import {
  getCashierShiftSummary,
  todayRange,
  type CashierShiftSummary,
} from '@/services/calcEngine';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
];

export default function CAOverview() {
  const { appUser } = useAuth();
  const cc        = appUser?.currency_code ?? 'KES';
  const cashierId = appUser?.id ?? '';
  const tenantId  = appUser?.tenant_id ?? '';

  const [stats,      setStats]      = useState<CashierShiftSummary | null>(null);
  const [hourlyData, setHourlyData] = useState<{ h: string; sales: number; txn: number }[]>([]);
  const [payMethods, setPayMethods] = useState<{ name: string; value: number }[]>([]);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    if (!cashierId) return;
    setLoading(true);
    try {
      const { start, end } = todayRange();

      // ── All queries in parallel ───────────────────────────────────
      const [shiftSummary, hourlyRes, paymentsRes] = await Promise.all([
        // 1. Shift KPIs from centralized engine (validates invariants)
        getCashierShiftSummary(cashierId, tenantId, start, end),

        // 2. Hourly breakdown from sales header (no item joins needed)
        supabase.from('sales')
          .select('total_amount, created_at, payment_method')
          .eq('cashier_id', cashierId)
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .gte('created_at', start)
          .lte('created_at', end),

        // 3. Payment method distribution
        supabase.from('sales')
          .select('payment_method')
          .eq('cashier_id', cashierId)
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .gte('created_at', start)
          .lte('created_at', end),
      ]);

      setStats(shiftSummary);

      // Build hourly chart (07:00–20:00)
      const hMap: Record<number, { sales: number; txn: number }> = {};
      for (let h = 7; h <= 20; h++) hMap[h] = { sales: 0, txn: 0 };
      (hourlyRes.data ?? []).forEach((s: { total_amount: number; created_at: string }) => {
        const h = new Date(s.created_at).getHours();
        if (hMap[h]) { hMap[h].sales += s.total_amount; hMap[h].txn++; }
      });
      setHourlyData(Object.entries(hMap).map(([h, v]) => ({ h: `${h}:00`, sales: v.sales, txn: v.txn })));

      // Payment method breakdown
      const pmMap: Record<string, number> = {};
      (paymentsRes.data ?? []).forEach((r: { payment_method: string }) => {
        pmMap[r.payment_method] = (pmMap[r.payment_method] ?? 0) + 1;
      });
      setPayMethods(Object.entries(pmMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value,
      })));
    } catch (err) {
      toast.error('Failed to load shift data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cashierId, tenantId]);

  useEffect(() => { load(); }, [load]);

  // Shift duration from midnight
  const elapsed = Math.floor((Date.now() - new Date().setHours(0,0,0,0)) / 60000);
  const shiftDuration = `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`;

  const kpis = stats ? [
    { label: "Today's Revenue",   value: formatCurrencyCompact(stats.revenue, cc),          sub: 'Total shift revenue',    icon: DollarSign,  color: 'text-blue-600' },
    { label: 'Orders Served',     value: stats.transactionCount.toString(),                 sub: 'Completed transactions', icon: ShoppingBag, color: 'text-emerald-600' },
    { label: 'Average Sale',      value: formatCurrencyCompact(stats.avgOrderValue, cc),    sub: 'Per transaction',        icon: TrendingUp,  color: 'text-violet-600' },
    { label: 'Products Sold',     value: stats.itemsSold.toString(),                        sub: 'Units today',            icon: Package,     color: 'text-amber-600' },
    { label: 'Customers Served',  value: stats.uniqueCustomers.toString(),                  sub: 'Unique customers',       icon: Users,       color: 'text-sky-600' },
    { label: 'Refunds',           value: stats.refundCount.toString(),                      sub: 'Today',                  icon: TrendingUp,  color: 'text-red-500' },
    { label: 'Shift Duration',    value: shiftDuration,                                     sub: 'Since 07:00',            icon: Clock,       color: 'text-indigo-600' },
    { label: 'Shift Sales',       value: formatCurrencyCompact(stats.revenue, cc),          sub: 'Same as today',          icon: DollarSign,  color: 'text-teal-600' },
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
=======
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/useCurrency';
import { DollarSign, ShoppingBag, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const TT = { background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px' };

interface SaleRow {
  id: string; total: number; items: { qty: number }[];
  payment_method: string; transaction_id: string; created_at: string;
}

export default function CAOverview() {
  const { appUser } = useAuth();
  const { format: formatAmt } = useCurrency();
  const displayName = appUser?.display_name || 'Cashier';
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!appUser?.id) return;
    setLoading(true);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data, error } = await supabase.from('sales')
      .select('id, total, items, payment_method, transaction_id, created_at')
      .eq('cashier_id', appUser.id)
      .eq('status', 'completed')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) console.error('[CAOverview] fetch error:', error);
    setSales(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [appUser?.id]);

  useEffect(() => { load(); }, [load, tick]);

  // Realtime: auto-refresh when this cashier inserts a new sale
  useEffect(() => {
    if (!appUser?.id) return;
    const ch = supabase.channel('ca-overview')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales', filter: `cashier_id=eq.${appUser.id}` },
        () => setTick(t => t + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [appUser?.id]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const shiftStart = new Date(now);
  shiftStart.setHours(now.getHours() < 14 ? 8 : 14, 0, 0, 0);

  const todayRevenue = sales.reduce((s, r) => s + r.total, 0);
  const shiftRevenue = sales.filter(s => new Date(s.created_at) >= shiftStart).reduce((s, r) => s + r.total, 0);
  const txnCount = sales.length;
  const avgSale = txnCount ? todayRevenue / txnCount : 0;

  // Hourly transaction count chart
  const hourlyMap: Record<string, number> = {};
  sales.forEach(s => {
    const h = new Date(s.created_at).getHours();
    const label = h < 12 ? `${h || 12}am` : `${h === 12 ? 12 : h - 12}pm`;
    hourlyMap[label] = (hourlyMap[label] || 0) + 1;
  });
  const hourly = Array.from({ length: 11 }, (_, i) => {
    const h = i + 8;
    const label = h < 12 ? `${h}am` : `${h === 12 ? 12 : h - 12}pm`;
    return { h: label, s: hourlyMap[label] || 0 };
  });

  const KPIs = [
    { label: "Today's Sales",  value: formatAmt(todayRevenue), change: `${txnCount} transactions`, icon: DollarSign, color: '#2563EB' },
    { label: 'Transactions',   value: String(txnCount),        change: 'completed today',           icon: ShoppingBag, color: '#7C3AED' },
    { label: 'Shift Sales',    value: formatAmt(shiftRevenue), change: 'current shift',              icon: Clock, color: '#D97706' },
    { label: 'Avg Sale Value', value: formatAmt(avgSale),      change: 'per transaction',            icon: TrendingUp, color: '#16A34A' },
  ];

  const Sk = () => <Skeleton className="h-5 w-16 bg-slate-100" />;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 text-balance">Good day, {displayName}!</h2>
          <p className="text-sm text-slate-500 mt-1">Your shift summary</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTick(t => t + 1)} disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Badge className="text-xs border shrink-0" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#16A34A' }}>
            On Shift
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIs.map(k => (
          <Card key={k.label} className="border h-full hover-lift" style={CARD_STYLE}>
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${k.color}20`, border: `1px solid ${k.color}30` }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <p className="text-xl font-bold text-slate-900">{loading ? <Sk /> : k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              <p className="text-xs mt-1 text-emerald-600">{k.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border" style={CARD_STYLE}>
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-sm font-semibold text-slate-900 text-balance">Transactions per Hour (Today)</h3>
        </div>
        <div className="px-5 pb-5">
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourly} barSize={24}>
                <XAxis dataKey="h" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [v, 'Transactions']} />
                <Bar dataKey="s" fill="#2563EB" radius={[4, 4, 0, 0]} name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card className="border" style={CARD_STYLE}>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 text-balance">Recent Transactions</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-slate-50" />)}</div>
        ) : sales.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">No transactions yet today. Complete a sale to see data here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['ID', 'Items', 'Total', 'Method', 'Time'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 8).map(t => {
                  const itemCount = Array.isArray(t.items) ? t.items.reduce((s: number, i: any) => s + (i.qty || 1), 0) : 0;
                  const elapsed = Math.round((Date.now() - new Date(t.created_at).getTime()) / 60000);
                  const timeAgo = elapsed < 60 ? `${elapsed}m ago` : `${Math.floor(elapsed / 60)}h ago`;
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-blue-500 whitespace-nowrap">{t.transaction_id}</td>
                      <td className="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">{itemCount}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatAmt(t.total)}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge className="text-xs border capitalize" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>{t.payment_method}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{timeAgo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
      </Card>
    </div>
  );
}
