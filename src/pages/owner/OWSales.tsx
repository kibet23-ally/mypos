import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Search, ShoppingBag, TrendingUp, DollarSign, Receipt,
  Eye, Download, Printer, X, Calendar, Filter, RefreshCw,
  ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { downloadReceipt, printReceipt, type ReceiptData } from '@/lib/receiptUtils';
import ReceiptModal from '@/components/common/ReceiptModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';

interface SaleItem { product_id: string; name: string; qty: number; price: number; }
/** Local shape that matches what the OWSales Supabase query actually returns. */
interface LocalSale {
  id: string;
  transaction_id: string;
  total: number;
  subtotal: number | null;
  discount: number;
  payment_method: string;
  status: string;
  notes: string | null;
  cashier_id: string;
  customer_id: string | null;
  items: SaleItem[];
  created_at: string;
  cashier?: { display_name: string | null; email: string };
  customer?: { name: string } | null;
}

const PAGE_SIZE = 15;
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  refunded:  'bg-red-50 text-red-700 border-red-200',
  partial:   'bg-amber-50 text-amber-700 border-amber-200',
  held:      'bg-secondary text-muted-foreground border-border',
};

type Tab = 'history' | 'analytics';

export default function OWSales() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [tab, setTab] = useState<Tab>('history');
  const [sales, setSales] = useState<LocalSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [payFilter, setPayFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<LocalSale | null>(null);
  const [receiptModal, setReceiptModal] = useState<ReceiptData | null>(null);
  const [period, setPeriod] = useState<'daily'|'weekly'|'monthly'>('daily');

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('sales')
      .select('id, transaction_id, total, subtotal, discount, payment_method, status, notes, cashier_id, customer_id, items, created_at, cashier:profiles!cashier_id(display_name, email), customer:customers(name)', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`transaction_id.ilike.%${search}%`);
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
    if (payFilter) q = q.eq('payment_method', payFilter);
    const { data, count } = await q;
    setSales(Array.isArray(data) ? (data as unknown as LocalSale[]) : []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [appUser?.tenant_id, page, search, dateFrom, dateTo, payFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Analytics data ──
  const salesByDay = (() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const d = s.created_at.slice(0, 10);
      map[d] = (map[d] || 0) + s.total;
    });
    return Object.entries(map).sort().slice(-14).map(([date, amt]) => ({ date: date.slice(5), amt }));
  })();

  const payBreakdown = (() => {
    const map: Record<string, number> = {};
    sales.forEach(s => { map[s.payment_method] = (map[s.payment_method] || 0) + s.total; });
    return Object.entries(map).map(([method, amt]) => ({ method, amt }));
  })();

  const totalRevenue = sales.reduce((s, r) => s + r.total, 0);
  const todaySales = sales.filter(s => s.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const avgOrder = sales.length ? totalRevenue / sales.length : 0;

  const openReceipt = (s: LocalSale) => {
    const tenantTaxRate = appUser?.tenant?.tax_rate ?? 0;
    const subtotal = s.subtotal ?? (tenantTaxRate > 0 ? s.total / (1 + tenantTaxRate / 100) : s.total);
    const tax = s.total - subtotal;
    const r: ReceiptData = {
      transactionId: s.transaction_id,
      businessName: appUser?.tenant?.business_name ?? 'PosifyPro',
      cashierName: s.cashier?.display_name ?? s.cashier?.email ?? 'Staff',
      items: s.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal,
      tax,
      discount: s.discount,
      total: s.total,
      paymentMethod: s.payment_method,
      timestamp: new Date(s.created_at),
    };
    setReceiptModal(r);
  };

  const handleRefund = async (s: LocalSale) => {
    if (!confirm(`Refund transaction ${s.transaction_id}?`)) return;
    const { error } = await supabase.from('sales').update({ status: 'refunded' }).eq('id', s.id);
    if (error) toast.error(error.message); else { toast.success('Sale marked as refunded'); load(); }
  };

  return (
    <div className="space-y-5 fade-in">
      {receiptModal && <ReceiptModal data={receiptModal} formatAmt={fmt} onClose={() => setReceiptModal(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Sales</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Transaction history, analytics &amp; reports</p>
        </div>
        <div className="flex gap-2">
          {(['history','analytics'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`h-9 px-4 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'text-white' : 'text-muted-foreground border border-border bg-white hover:bg-card'}`}
              style={tab === t ? { background: 'hsl(var(--primary))' } : undefined}>
              {t === 'history' ? 'History' : 'Analytics'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), icon: DollarSign, color: 'hsl(var(--primary))' },
          { label: 'Transactions', value: total, icon: ShoppingBag, color: 'hsl(var(--primary))' },
          { label: "Today's Sales", value: todaySales.length, icon: TrendingUp, color: '#16A34A' },
          { label: 'Avg. Order', value: fmt(avgOrder), icon: Receipt, color: '#D97706' },
        ].map(k => (
          <Card key={k.label} className="border" style={CARD}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.color + '15' }}>
                  <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{loading ? '–' : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tab === 'analytics' ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border" style={CARD}>
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Revenue (last 14 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesByDay} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amt" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border" style={CARD}>
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={payBreakdown} barSize={20} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis type="category" dataKey="method" tick={{ fontSize: 10, fill: '#94A3B8' }} width={55} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amt" fill="#7C3AED" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Filters */}
          <Card className="border" style={CARD}>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-40">
                  {!search && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />}
                  <Input placeholder="Search by Txn ID…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                    className={`h-9 bg-card border-border rounded-xl text-sm ${!search ? 'pl-9' : 'pl-3'}`} />
                </div>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }}
                  className="h-9 bg-card border border-border rounded-xl px-3 text-sm text-foreground focus:outline-none focus:border-primary" />
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }}
                  className="h-9 bg-card border border-border rounded-xl px-3 text-sm text-foreground focus:outline-none focus:border-primary" />
                <select value={payFilter} onChange={e => { setPayFilter(e.target.value); setPage(0); }}
                  className="h-9 bg-card border border-border rounded-xl px-3 text-sm text-foreground focus:outline-none">
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile</option>
                </select>
                <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPayFilter(''); setPage(0); }}
                  className="h-9 px-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border" style={CARD}>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Txn ID','Date','Cashier','Customer','Items','Discount','Total','Method','Status','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array.from({ length: 10 }).map((__, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16 bg-card" /></td>
                        ))}
                      </tr>
                    )) : sales.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">No sales found</td></tr>
                    ) : sales.map(s => (
                      <tr key={s.id} className="border-b border-border hover:bg-card transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-primary font-semibold whitespace-nowrap">{s.transaction_id}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(s.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                          {s.cashier?.display_name ?? s.cashier?.email ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.customer?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{s.items?.length ?? 0}</td>
                        <td className="px-4 py-3 text-xs text-green-600 whitespace-nowrap">{s.discount > 0 ? `-${fmt(s.discount)}` : '—'}</td>
                        <td className="px-4 py-3 text-sm font-bold text-foreground whitespace-nowrap">{fmt(s.total)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs capitalize text-muted-foreground">{s.payment_method}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className={`text-xs border capitalize ${STATUS_COLOR[s.status] ?? STATUS_COLOR.completed}`}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setDetail(s)} title="View" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => openReceipt(s)} title="Receipt" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
                              <Receipt className="w-3.5 h-3.5 text-primary" />
                            </button>
                            {s.status === 'completed' && (
                              <button onClick={() => handleRefund(s)} title="Refund" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                                <RefreshCw className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </span>
                  <div className="flex gap-1.5">
                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-card">
                      <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <span className="text-xs text-muted-foreground self-center px-2">{page + 1} / {totalPages}</span>
                    <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-card">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Sale Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-semibold text-foreground text-sm">{detail.transaction_id}</p>
                <p className="text-xs text-muted-foreground">{new Date(detail.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setDetail(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Cashier', detail.cashier?.display_name ?? detail.cashier?.email ?? '—'],
                  ['Customer', detail.customer?.name ?? '—'],
                  ['Payment', detail.payment_method],
                  ['Status', detail.status],
                  ['Discount', detail.discount > 0 ? fmt(detail.discount) : '—'],
                  ['Total', fmt(detail.total)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-card rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">{k}</p>
                    <p className="font-semibold text-foreground capitalize">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items</p>
                <div className="space-y-2">
                  {detail.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm px-3 py-2.5 rounded-xl bg-card">
                      <span className="text-foreground">{item.name}</span>
                      <div className="text-right">
                        <span className="text-muted-foreground text-xs mr-2">×{item.qty}</span>
                        <span className="font-semibold text-foreground">{fmt(item.qty * item.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {detail.notes && (
                <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700 border border-amber-100">
                  <p className="text-xs font-semibold mb-1">Notes</p>
                  {detail.notes}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-border flex gap-2">
              <button onClick={() => openReceipt(detail)}
                className="flex-1 h-9 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-card flex items-center justify-center gap-1.5">
                <Receipt className="w-4 h-4" /> Preview Receipt
              </button>
              <button onClick={() => setDetail(null)}
                className="flex-1 h-9 rounded-xl text-sm font-bold text-white" style={{ background: 'hsl(var(--primary))' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}