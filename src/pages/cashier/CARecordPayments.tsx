import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';
import { CreditCard, Search, Plus, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface Invoice { id: string; invoice_number: string; customer_name?: string; total: number; amount_paid: number; balance_due: number; status: string; }
const PAGE = 15;
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inp = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';
const PAY_METHODS = ['cash','mpesa','card','bank_transfer'];

export default function CARecordPayments() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [form, setForm] = useState({ amount: '', method: 'cash', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('invoices')
      .select('id,invoice_number,customer_name,total,amount_paid,balance_due,status', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id)
      .neq('status', 'paid')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setInvoices((data??[]) as Invoice[]); setTotal(count??0); }
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  useEffect(() => { load(); }, [load]);

  const openPayment = (inv: Invoice) => {
    setSelected(inv);
    setForm({ amount: String(inv.balance_due), method: 'cash', reference: '', notes: '' });
    setOpen(true);
  };

  const recordPayment = async () => {
    if (!selected || !appUser?.tenant_id) return;
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > selected.balance_due + 0.01) { toast.error(`Amount exceeds balance due (${fmt(selected.balance_due)})`); return; }
    setSaving(true);
    // Insert payment record
    const { error: pErr } = await supabase.from('invoice_payments').insert({
      tenant_id: appUser.tenant_id, invoice_id: selected.id,
      amount, method: form.method, reference: form.reference || null,
      notes: form.notes || null, paid_at: new Date().toISOString(), recorded_by: appUser.id,
    });
    if (pErr) { toast.error(pErr.message); setSaving(false); return; }
    // Update invoice
    const newPaid = (selected.amount_paid || 0) + amount;
    const newBalance = selected.total - newPaid;
    const newStatus = newBalance <= 0.01 ? 'paid' : 'partial';
    await supabase.from('invoices').update({
      amount_paid: newPaid, balance_due: Math.max(0, newBalance),
      status: newStatus, updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    setSaving(false);
    toast.success(`Payment of ${fmt(amount)} recorded`);
    setOpen(false); load();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Record Payments</h1>
        <Badge variant="secondary">{total} outstanding</Badge>
      </div>
      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <Input className={`${inp} pl-9`} placeholder="Search invoice or customer…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-11 w-full"/>)}</div>
          : invoices.length===0 ? <div className="text-center py-10 text-muted-foreground"><CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-60"/><p>All invoices are paid up!</p></div>
          : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-border">
                {['Invoice #','Customer','Total','Paid','Balance Due','Status',''].map(h=><th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>{invoices.map(inv=>(
                <tr key={inv.id} className="border-b border-border hover:bg-card">
                  <td className="py-2 px-3 font-mono font-semibold text-primary">{inv.invoice_number}</td>
                  <td className="py-2 px-3 text-foreground">{inv.customer_name||'—'}</td>
                  <td className="py-2 px-3 font-semibold">{fmt(inv.total)}</td>
                  <td className="py-2 px-3 text-green-700">{fmt(inv.amount_paid||0)}</td>
                  <td className="py-2 px-3 font-bold text-orange-600">{fmt(inv.balance_due||0)}</td>
                  <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-orange-100 text-orange-700">{inv.status}</span></td>
                  <td className="py-2 px-3">
                    <button onClick={()=>openPayment(inv)} className="flex items-center gap-1 px-3 py-1 bg-primary hover:opacity-90 text-white text-xs font-medium rounded-lg transition-colors">
                      <Plus className="w-3 h-3"/>Pay
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {total > PAGE && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Showing {page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="w-4 h-4"/></Button>
                <Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}><ChevronRight className="w-4 h-4"/></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>Record Payment — {selected?.invoice_number}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <div className="bg-card rounded-xl p-3 text-sm space-y-0.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{selected.customer_name||'—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Invoice Total</span><span className="font-semibold">{fmt(selected.total)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-green-700">{fmt(selected.amount_paid||0)}</span></div>
                <div className="flex justify-between font-bold"><span>Balance Due</span><span className="text-orange-600">{fmt(selected.balance_due||0)}</span></div>
              </div>
              <div><Label>Amount Paid</Label><Input type="number" min="0.01" max={String(selected.balance_due)} step="0.01" className={inp} value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
              <div><Label>Payment Method</Label>
                <select className={`w-full ${inp}`} value={form.method} onChange={e=>setForm(f=>({...f,method:e.target.value}))}>
                  {PAY_METHODS.map(m=><option key={m} value={m} className="capitalize">{m.replace('_',' ')}</option>)}
                </select>
              </div>
              <div><Label>Reference (optional)</Label><Input className={inp} value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))} placeholder="Transaction ID, receipt #…"/></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button className="bg-primary hover:opacity-90 text-white" onClick={recordPayment} disabled={saving}>{saving?'Recording…':'Record Payment'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
