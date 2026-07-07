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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                  ))}
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
