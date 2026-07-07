import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { History, Search, Download, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SaleItem { product_id: string; name: string; qty: number; price: number; buying_cost?: number; }
interface Sale {
  id: string; receipt_number: string; total_amount: number; subtotal: number;
  cogs_amount: number; profit_amount: number; payment_method: string;
  cashier_id: string; cashier_name?: string; tax_amount: number; discount_amount: number;
  items: SaleItem[]; created_at: string; customer_id?: string; customer_name?: string;
}

const PAGE = 20;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const PM_COLORS: Record<string,string> = { cash:'bg-green-100 text-green-700', mpesa:'bg-blue-100 text-blue-700', card:'bg-purple-100 text-purple-700', bank_transfer:'bg-orange-100 text-orange-700' };

function downloadCSV(rows: string[][], fn: string) {
  const c = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c],{type:'text/csv'})); a.download = fn; a.click();
}

export default function OWSalesHistory() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [viewing, setViewing] = useState<Sale | null>(null);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('sales')
      .select('id,receipt_number,total_amount,subtotal,cogs_amount,profit_amount,payment_method,cashier_id,cashier_name,tax_amount,discount_amount,items,created_at,customer_id,customer_name', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id)
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`receipt_number.ilike.%${search}%,cashier_name.ilike.%${search}%,customer_name.ilike.%${search}%`);
    if (dateFrom) q = q.gte('created_at', dateFrom + 'T00:00:00');
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
    if (payMethod) q = q.eq('payment_method', payMethod);
    const { data, count, error } = await q;
    if (!error) { setSales((data ?? []) as Sale[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [appUser?.tenant_id, page, search, dateFrom, dateTo, payMethod]);

  useEffect(() => { load(); }, [load]);

  const totals = {
    revenue: sales.reduce((s, x) => s + (x.total_amount || 0), 0),
    cogs: sales.reduce((s, x) => s + (x.cogs_amount || 0), 0),
    profit: sales.reduce((s, x) => s + (x.profit_amount || 0), 0),
  };

  const exportCSV = () => {
    const rows = [['Receipt #','Date','Customer','Payment','Revenue','COGS','Gross Profit','Tax','Discount','Cashier'],
      ...sales.map(s=>[s.receipt_number, new Date(s.created_at).toLocaleString(), s.customer_name||'', s.payment_method, String(s.total_amount), String(s.cogs_amount||0), String(s.profit_amount||0), String(s.tax_amount||0), String(s.discount_amount||0), s.cashier_name||''])];
    downloadCSV(rows, 'sales-history.csv');
  };

  const clear = () => { setSearch(''); setDateFrom(''); setDateTo(''); setPayMethod(''); setPage(0); };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Sales History</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-1 h-9 text-slate-600"><Download className="w-4 h-4" />Export CSV</Button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[{label:'Revenue (page)',val:totals.revenue,color:'text-blue-700'},{label:'COGS (page)',val:totals.cogs,color:'text-slate-600'},{label:'Gross Profit (page)',val:totals.profit,color:'text-green-700'}].map(s=>(
          <Card key={s.label} style={CARD} className="rounded-2xl">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{fmt(s.val)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className={`${inp} pl-9`} placeholder="Search receipt, customer, cashier…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} />
            </div>
            <Input type="date" className={`${inp} w-full md:w-36`} value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(0);}} placeholder="From" />
            <Input type="date" className={`${inp} w-full md:w-36`} value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(0);}} placeholder="To" />
            <select className={`${inp} w-full md:w-36`} value={payMethod} onChange={e=>{setPayMethod(e.target.value);setPage(0);}}>
              <option value="">All Methods</option>
              {['cash','mpesa','card','bank_transfer'].map(m=><option key={m} value={m} className="capitalize">{m}</option>)}
            </select>
            {(search||dateFrom||dateTo||payMethod) && <Button variant="outline" size="sm" onClick={clear} className="gap-1 shrink-0"><X className="w-3 h-3"/>Clear</Button>}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="space-y-2">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-11 w-full"/>)}</div>
          : sales.length === 0 ? <div className="text-center py-10 text-slate-400"><History className="w-8 h-8 mx-auto mb-2 opacity-40"/><p>No sales found.</p></div>
          : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">
                {['Receipt','Date','Customer','Payment','Revenue','COGS','Gross Profit','Margin','Cashier',''].map(h=><th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>)}
              </tr></thead>
              <tbody>{sales.map(s=>{
                const margin = s.total_amount > 0 ? ((s.profit_amount||0)/s.total_amount*100).toFixed(1) : '0.0';
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-blue-700 font-semibold">{s.receipt_number}</td>
                    <td className="py-2 px-3 text-slate-500">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3 text-slate-600">{s.customer_name||'—'}</td>
                    <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PM_COLORS[s.payment_method]||'bg-slate-100 text-slate-600'}`}>{s.payment_method}</span></td>
                    <td className="py-2 px-3 font-semibold">{fmt(s.total_amount)}</td>
                    <td className="py-2 px-3 text-slate-500">{fmt(s.cogs_amount||0)}</td>
                    <td className={`py-2 px-3 font-semibold ${(s.profit_amount||0)>=0?'text-green-700':'text-red-600'}`}>{fmt(s.profit_amount||0)}</td>
                    <td className="py-2 px-3 text-slate-500">{margin}%</td>
                    <td className="py-2 px-3 text-slate-500">{s.cashier_name||'—'}</td>
                    <td className="py-2 px-3"><button onClick={()=>setViewing(s)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Eye className="w-4 h-4"/></button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
          {total > PAGE && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>Showing {page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="w-4 h-4"/></Button>
                <Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}><ChevronRight className="w-4 h-4"/></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale detail */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={()=>setViewing(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>Sale — {viewing.receipt_number}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <span><b>Date:</b> {new Date(viewing.created_at).toLocaleString()}</span>
                <span><b>Cashier:</b> {viewing.cashier_name||'—'}</span>
                <span><b>Customer:</b> {viewing.customer_name||'—'}</span>
                <span><b>Payment:</b> <span className="capitalize">{viewing.payment_method}</span></span>
              </div>
              <table className="w-full border border-slate-200 rounded-xl overflow-hidden whitespace-nowrap">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Product</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Price</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Total</th>
                </tr></thead>
                <tbody>{(Array.isArray(viewing.items)?viewing.items:[]).map((it,i)=>(
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-2 px-3">{it.name}</td>
                    <td className="py-2 px-3 text-right">{it.qty}</td>
                    <td className="py-2 px-3 text-right">{fmt(it.price)}</td>
                    <td className="py-2 px-3 text-right font-medium">{fmt(it.qty*it.price)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="space-y-1 text-sm border-t pt-2">
                {[['Subtotal',viewing.subtotal],['Tax',viewing.tax_amount||0],['Discount',-(viewing.discount_amount||0)]].map(([l,v])=>(
                  <div key={String(l)} className="flex justify-between text-slate-500"><span>{String(l)}</span><span>{fmt(Number(v))}</span></div>
                ))}
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>{fmt(viewing.total_amount)}</span></div>
                <div className="flex justify-between text-slate-400 text-xs"><span>COGS</span><span>{fmt(viewing.cogs_amount||0)}</span></div>
                <div className={`flex justify-between font-semibold ${(viewing.profit_amount||0)>=0?'text-green-700':'text-red-600'}`}><span>Gross Profit</span><span>{fmt(viewing.profit_amount||0)}</span></div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
