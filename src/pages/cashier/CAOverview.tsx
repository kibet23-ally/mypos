import { useEffect, useState, useCallback } from 'react';
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
      </Card>
    </div>
  );
}
