import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/useCurrency';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DollarSign, TrendingUp, ShoppingBag, Package } from 'lucide-react';
import { getCachedSalesHistory, cacheSalesHistory, historyWindowStartISO } from '@/lib/offlineDb';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const TT = { background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#F8FAFC' };

interface SaleItemJson { product_id: string; name: string; qty: number; price: number; }
interface Sale { id: string; total: number; subtotal: number | null; items: SaleItemJson[]; created_at: string; }

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      () => { clearTimeout(timer); resolve(fallback); }
    );
  });
}

export default function OWReports() {
  const { appUser } = useAuth();
  const { format: formatAmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [offlineNoData, setOfflineNoData] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    setOfflineNoData(false);

    if (!navigator.onLine) {
      console.log('[OWReports] Offline — loading sales history from cache (up to 90 days)');
      const [cachedSales] = await Promise.all([
        getCachedSalesHistory(appUser.tenant_id),
      ]);
      setSales(cachedSales as Sale[]);
      setLoading(false);
      if (cachedSales.length === 0) setOfflineNoData(true);
      return;
    }

    // Last 6 full months, for the YTD-style trend charts
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data: salesData } = await withTimeout(
      supabase
        .from('sales')
        .select('id, total, subtotal, items, created_at')
        .eq('tenant_id', appUser.tenant_id)
        .eq('status', 'completed')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true }),
      8000,
      { data: null } as any
    );

    const salesRows = (salesData ?? []) as Sale[];
    setSales(salesRows);
    // items are extracted inline from sales.items JSONB — no separate table query needed
    setLoading(false);

    // Refresh the 90-day offline cache
    const historyStart = historyWindowStartISO();
    supabase
      .from('sales')
      .select('id, total, subtotal, items, created_at')
      .eq('tenant_id', appUser.tenant_id)
      .eq('status', 'completed')
      .gte('created_at', historyStart)
      .then(({ data: historySales }) => {
        if (historySales) cacheSalesHistory(appUser.tenant_id, historySales).catch(() => {});
      });
  }, [appUser?.tenant_id]);

  useEffect(() => {
    load();
    const handleOnline = () => load();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [load]);

  // ── Derived metrics — all real, zero hardcoded numbers ──
  const totalRevenue = sales.reduce((t, s) => t + (s.total || 0), 0);
  // subtotal = pre-tax; if not stored fall back to total
  const totalSubtotal = sales.reduce((t, s) => t + (s.subtotal ?? s.total ?? 0), 0);
  const totalTransactions = sales.length;
  // Items sold: sum quantities from JSONB items array on each sale
  const itemsSold = sales.reduce((t, s) => {
    const arr: SaleItemJson[] = Array.isArray(s.items) ? s.items : [];
    return t + arr.reduce((a, i) => a + (i.qty || 0), 0);
  }, 0);

  const KPIs = [
    { label: 'Total Revenue (6mo)', value: formatAmt(totalRevenue), sub: `${totalTransactions} transactions`, icon: DollarSign, color: '#2563EB' },
    { label: 'Pre-tax Subtotal', value: formatAmt(totalSubtotal), sub: 'before tax', icon: TrendingUp, color: '#16A34A' },
    { label: 'Total Transactions', value: String(totalTransactions), sub: 'last 6 months', icon: ShoppingBag, color: '#7C3AED' },
    { label: 'Items Sold', value: String(itemsSold), sub: 'last 6 months', icon: Package, color: '#D97706' },
  ];

  // Build last 6 calendar months as buckets, even if some have zero sales
  const monthBuckets = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] };
  });

  const monthly = monthBuckets.map(b => {
    const inMonth = sales.filter(s => {
      const d = new Date(s.created_at);
      return d.getFullYear() === b.year && d.getMonth() === b.month;
    });
    const monthItemCount = inMonth.reduce((t, s) => {
      const arr: SaleItemJson[] = Array.isArray(s.items) ? s.items : [];
      return t + arr.reduce((a, i) => a + (i.qty || 0), 0);
    }, 0);
    return {
      month: b.label,
      sales: inMonth.reduce((t, s) => t + (s.total || 0), 0),
      profit: inMonth.reduce((t, s) => t + (s.subtotal ?? s.total ?? 0), 0),
      txns: inMonth.length,
      itemCount: monthItemCount,
    };
  });

  // Top 5 products by revenue — derived from JSONB items array on each sale
  const productTotals: Record<string, number> = {};
  sales.forEach(s => {
    const arr: SaleItemJson[] = Array.isArray(s.items) ? s.items : [];
    arr.forEach(it => {
      productTotals[it.name] = (productTotals[it.name] || 0) + (it.qty * it.price);
    });
  });
  const topProducts = Object.entries(productTotals)
    .map(([name, rev]) => ({ name, sales: rev }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (offlineNoData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
        <p className="text-sm font-medium text-slate-600">You're offline</p>
        <p className="text-xs text-slate-400 max-w-xs">
          No cached report data yet on this device. Open Reports once while online to enable offline viewing (last 90 days).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 text-balance">Reports & Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Business performance insights</p>
        </div>
        {!navigator.onLine && (
          <Badge className="text-xs border shrink-0" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#D97706' }}>
            Offline — last 90 days cached
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIs.map(k => (
          <Card key={k.label} className="border h-full hover-lift" style={CARD_STYLE}>
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${k.color}20`, border: `1px solid ${k.color}30` }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <p className="text-xl font-bold text-slate-900">{k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              <p className="text-xs mt-1 text-emerald-600">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 text-balance">Monthly Sales vs Subtotal</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => formatAmt(v)} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => [formatAmt(v), '']} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} formatter={v => <span style={{ color: '#CBD5E1', fontSize: 11 }}>{v}</span>} />
                  <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2} fill="url(#sGrad)" name="Sales" />
                  <Area type="monotone" dataKey="profit" stroke="#16A34A" strokeWidth={2} fill="url(#pGrad)" name="Subtotal" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 text-balance">Top 5 Products</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {topProducts.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-xs text-slate-400">No product sales yet</p>
              </div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProducts} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => formatAmt(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#CBD5E1' }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={TT} formatter={(v: number) => [formatAmt(v), 'Revenue']} />
                    <Bar dataKey="sales" fill="#7C3AED" radius={[0, 4, 4, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border xl:col-span-2 h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 text-balance">Transaction Volume</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthly}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => [v, 'Transactions']} />
                  <Line type="monotone" dataKey="txns" stroke="#60A5FA" strokeWidth={2} dot={false} name="Transactions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
