<<<<<<< HEAD
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { History, DollarSign, ShoppingBag, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';

interface Txn { id: string; time: string; items: number; amount: number; method: 'Cash' | 'Card' | 'Mobile'; status: 'completed' | 'refunded'; }

const TXNS: Txn[] = [
  { id: 'TXN-0847', time: '12:44 PM', items: 3, amount: 1850, method: 'Card',   status: 'completed' },
  { id: 'TXN-0846', time: '12:31 PM', items: 1, amount: 550,  method: 'Mobile', status: 'completed' },
  { id: 'TXN-0845', time: '12:18 PM', items: 2, amount: 950,  method: 'Cash',   status: 'completed' },
  { id: 'TXN-0844', time: '11:59 AM', items: 5, amount: 3100, method: 'Card',   status: 'completed' },
  { id: 'TXN-0843', time: '11:42 AM', items: 1, amount: 350,  method: 'Cash',   status: 'refunded' },
  { id: 'TXN-0842', time: '11:27 AM', items: 2, amount: 1150, method: 'Card',   status: 'completed' },
  { id: 'TXN-0841', time: '11:10 AM', items: 4, amount: 2400, method: 'Mobile', status: 'completed' },
  { id: 'TXN-0840', time: '10:55 AM', items: 1, amount: 400,  method: 'Cash',   status: 'completed' },
];

const hourChart = [
  { h: '8am', rev: 4800 }, { h: '9am', rev: 7200 }, { h: '10am', rev: 9600 },
  { h: '11am', rev: 12400 }, { h: '12pm', rev: 18800 }, { h: '1pm', rev: 10900 },
];

const METHOD_ICON = { Cash: Banknote, Card: CreditCard, Mobile: Smartphone };
const STATUS_CFG = {
  completed: { cls: 'bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)]', label: 'Completed' },
  refunded:  { cls: 'bg-[hsl(0_72%_94%)] text-[hsl(0_72%_35%)]',     label: 'Refunded' },
};

export default function CASalesHistory() {
  const { appUser } = useAuth();
  const cc = appUser?.currency_code ?? 'KES';

  const total = TXNS.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">Sales History</h2>
        <p className="text-sm text-muted-foreground mt-1">Your transactions for today's shift</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Transactions Today', value: TXNS.filter(t => t.status === 'completed').length, icon: ShoppingBag },
          { label: 'Total Revenue',      value: formatCurrency(total, cc),                         icon: DollarSign },
          { label: 'Refunds',            value: TXNS.filter(t => t.status === 'refunded').length,  icon: History },
        ].map(s => (
          <Card key={s.label} className="border border-border h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
=======
import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };

export default function CASalesHistory() {
  const { appUser } = useAuth();
  const { format: formatAmt } = useCurrency();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 200);

  useEffect(() => {
    if (!appUser?.id) return;
    supabase.from('sales').select('*')
      .eq('cashier_id', appUser.id)
      .eq('tenant_id', appUser.tenant_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setSales(Array.isArray(data) ? data : []); setLoading(false); });
  }, [appUser?.id]);

  const filtered = sales.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.transaction_id || '').toLowerCase().includes(q) ||
      (s.payment_method || '').toLowerCase().includes(q) ||
      String(s.total || '').includes(q)
    );
  });

  const totalToday = sales
    .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const avgSale = sales.length ? sales.reduce((s, t) => s + t.total, 0) / sales.length : 0;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 text-balance">My Sales History</h2>
          <p className="text-sm text-slate-500 mt-1">All transactions processed by you</p>
        </div>
        <div className="relative shrink-0 w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search transactions…" value={searchRaw} onChange={e => setSearchRaw(e.target.value)}
            className="pl-9 h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Today's Revenue", value: formatAmt(totalToday), icon: DollarSign, color: '#2563EB' },
          { label: 'Total Transactions', value: String(sales.length), icon: ShoppingBag, color: '#7C3AED' },
          { label: 'Avg Sale Value', value: formatAmt(avgSale), icon: TrendingUp, color: '#16A34A' },
        ].map(s => (
          <Card key={s.label} className="border h-full" style={CARD_STYLE}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{loading ? '–' : s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

<<<<<<< HEAD
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">Revenue by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourChart} barSize={28}>
                <XAxis dataKey="h" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v, cc)} />
                <Tooltip formatter={(v: number) => [formatCurrency(v, cc), 'Revenue']} />
                <Bar dataKey="rev" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['ID', 'Time', 'Items', 'Amount', 'Method', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">{h}</th>
=======
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">
            {loading ? 'Loading…' : `${filtered.length} Transaction${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Transaction ID','Items','Total','Method','Date & Time'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
                  ))}
                </tr>
              </thead>
              <tbody>
<<<<<<< HEAD
                {TXNS.map((t, i) => {
                  const Icon = METHOD_ICON[t.method];
                  const cfg = STATUS_CFG[t.status];
                  return (
                    <tr key={t.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-6 py-3 text-xs text-muted-foreground font-mono">{t.id}</td>
                      <td className="px-6 py-3 text-sm text-foreground">{t.time}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{t.items}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-foreground">{formatCurrency(t.amount, cc)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Icon className="w-4 h-4 shrink-0" />{t.method}
                        </div>
                      </td>
                      <td className="px-6 py-3"><Badge variant="secondary" className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge></td>
                    </tr>
                  );
                })}
=======
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 5 }).map((__, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-20 bg-slate-50" /></td>)}
                  </tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No transactions found</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-blue-500 whitespace-nowrap">{s.transaction_id || s.id.slice(0,8)}</td>
                    <td className="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">
                      {Array.isArray(s.items) ? s.items.reduce((sum: number, i: any) => sum + (i.qty || 1), 0) : '–'}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatAmt(s.total || 0)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Badge className="text-xs border capitalize" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>{s.payment_method || '—'}</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
