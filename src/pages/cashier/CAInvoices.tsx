import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCurrency } from '@/hooks/useCurrency';
import { FileText, Search, Eye, ChevronLeft, ChevronRight, X, Download } from 'lucide-react';

interface InvoicePayment { id: string; amount: number; method: string; paid_at: string; }
interface Invoice {
  id: string; invoice_number: string; customer_id?: string; customer_name?: string;
  items: {name:string;qty:number;price:number}[]; subtotal: number; tax_amount: number;
  total: number; amount_paid: number; balance_due: number; due_date?: string;
  status: string; created_at: string;
}

const PAGE = 20;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const STATUS_COLORS: Record<string,string> = { draft:'bg-slate-100 text-slate-600', sent:'bg-blue-100 text-blue-700', partial:'bg-orange-100 text-orange-700', paid:'bg-green-100 text-green-700', overdue:'bg-red-100 text-red-700', cancelled:'bg-red-50 text-red-400' };

export default function CAInvoices() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('invoices')
      .select('id,invoice_number,customer_id,customer_name,items,subtotal,tax_amount,total,amount_paid,balance_due,due_date,status,created_at', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id)
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setInvoices((data??[]) as Invoice[]); setTotal(count??0); }
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  useEffect(() => { load(); }, [load]);

  const viewInvoice = async (inv: Invoice) => {
    setViewing(inv);
    const { data } = await supabase.from('invoice_payments').select('*').eq('invoice_id', inv.id).order('paid_at');
    setPayments((data??[]) as InvoicePayment[]);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">Invoices</h1>
        <Badge variant="secondary">{total}</Badge>
      </div>
      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className={`${inp} pl-9`} placeholder="Search invoices…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-11 w-full"/>)}</div>
          : invoices.length===0 ? <div className="text-center py-10 text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40"/><p>No invoices found.</p></div>
          : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">
                {['Invoice #','Customer','Total','Paid','Balance','Due Date','Status',''].map(h=><th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>)}
              </tr></thead>
              <tbody>{invoices.map(inv=>(
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono font-semibold text-blue-700">{inv.invoice_number}</td>
                  <td className="py-2 px-3 text-slate-700">{inv.customer_name||'—'}</td>
                  <td className="py-2 px-3 font-semibold">{fmt(inv.total)}</td>
                  <td className="py-2 px-3 text-green-700">{fmt(inv.amount_paid||0)}</td>
                  <td className={`py-2 px-3 font-semibold ${(inv.balance_due||0)>0?'text-orange-600':'text-green-700'}`}>{fmt(inv.balance_due||0)}</td>
                  <td className="py-2 px-3 text-slate-500">{inv.due_date||'—'}</td>
                  <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[inv.status]||'bg-slate-100 text-slate-600'}`}>{inv.status}</span></td>
                  <td className="py-2 px-3"><button onClick={()=>viewInvoice(inv)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Eye className="w-4 h-4"/></button></td>
                </tr>
              ))}</tbody>
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

      {viewing && (
        <Dialog open={!!viewing} onOpenChange={()=>setViewing(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{viewing.invoice_number}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-3 text-slate-600">
                <span><b>Customer:</b> {viewing.customer_name||'—'}</span>
                <span><b>Due:</b> {viewing.due_date||'—'}</span>
                <span><b>Status:</b> <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[viewing.status]}`}>{viewing.status}</span></span>
              </div>
              <table className="w-full border border-slate-200 rounded-xl overflow-hidden whitespace-nowrap">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Item</th>
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
              <div className="space-y-1 border-t pt-2 text-right">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmt(viewing.subtotal)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Tax</span><span>{fmt(viewing.tax_amount||0)}</span></div>
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{fmt(viewing.total)}</span></div>
                <div className="flex justify-between text-green-700"><span>Paid</span><span>{fmt(viewing.amount_paid||0)}</span></div>
                <div className={`flex justify-between font-semibold ${(viewing.balance_due||0)>0?'text-orange-600':'text-green-700'}`}><span>Balance Due</span><span>{fmt(viewing.balance_due||0)}</span></div>
              </div>
              {payments.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-2">Payment History</p>
                  <div className="space-y-1">
                    {payments.map(p=>(
                      <div key={p.id} className="flex justify-between text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5">
                        <span>{new Date(p.paid_at).toLocaleString()}</span>
                        <span className="capitalize">{p.method}</span>
                        <span className="font-semibold text-green-700">{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
