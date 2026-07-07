import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Search, Plus, FileText, Eye, Printer, ChevronLeft, ChevronRight,
  DollarSign, CreditCard, Smartphone, Banknote, X, CheckCircle
} from 'lucide-react';

interface InvItem { description: string; qty: number; unit_price: number; total: number; }
interface Invoice {
  id: string; tenant_id: string; invoice_number: string; customer_id?: string; customer_name?: string;
  items: InvItem[]; subtotal: number; discount: number; tax_amount: number; total: number;
  amount_paid: number; balance_due: number; status: string; due_date?: string; notes?: string; created_at: string;
}
interface InvoicePayment { id: string; invoice_id: string; amount: number; payment_method: string; reference?: string; paid_at: string; }
interface Customer { id: string; name: string; }
interface Product { id: string; name: string; price: number; }

const PAGE = 15;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const STATUS_COLORS: Record<string, string> = {
  unpaid:  'bg-red-100 text-red-700',
  partial: 'bg-orange-100 text-orange-700',
  paid:    'bg-green-100 text-green-700',
  overdue: 'bg-red-200 text-red-800',
  void:    'bg-slate-100 text-slate-500',
};
const PAY_METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { key: 'bank_transfer', label: 'Bank', icon: DollarSign },
];
const EMPTY_ITEM: InvItem = { description: '', qty: 1, unit_price: 0, total: 0 };

export default function OWInvoices() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const canEdit = appUser?.role === 'owner' || appUser?.role === 'manager';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', notes: '' });
  const [form, setForm] = useState({ customer_id: '', customer_name: '', notes: '', due_date: '', discount: '0' });
  const [items, setItems] = useState<InvItem[]>([{ ...EMPTY_ITEM }]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const taxRate = appUser?.tenant?.tax_rate ?? 0;

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discountAmt = parseFloat(form.discount) || 0;
  const taxAmt = (subtotal - discountAmt) * (taxRate / 100);
  const grandTotal = subtotal - discountAmt + taxAmt;

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('invoices').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id).order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setInvoices((data ?? []) as Invoice[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  const loadLookups = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    const [c, p] = await Promise.all([
      supabase.from('customers').select('id,name').eq('tenant_id', appUser.tenant_id).order('name').limit(200),
      supabase.from('products').select('id,name,price').eq('tenant_id', appUser.tenant_id).order('name').limit(500),
    ]);
    setCustomers((c.data ?? []) as Customer[]);
    setProducts((p.data ?? []) as Product[]);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  const loadPayments = async (invoiceId: string) => {
    const { data } = await supabase.from('invoice_payments').select('*').eq('invoice_id', invoiceId).order('paid_at');
    setPayments((data ?? []) as InvoicePayment[]);
  };

  const openPay = (inv: Invoice) => {
    setPayInvoice(inv);
    setPayForm({ amount: inv.balance_due > 0 ? String(inv.balance_due) : '', method: 'cash', reference: '', notes: '' });
    loadPayments(inv.id);
    setPayOpen(true);
  };

  const setItem = (idx: number, field: keyof InvItem, val: string | number) => {
    setItems(prev => {
      const arr = [...prev];
      const it = { ...arr[idx], [field]: field === 'description' ? val : Number(val) };
      if (field === 'qty' || field === 'unit_price') it.total = it.qty * it.unit_price;
      arr[idx] = it;
      return arr;
    });
  };

  const save = async () => {
    if (!appUser?.tenant_id) return;
    if (!items.some(i => i.description && i.total > 0)) { toast.error('Add at least one item'); return; }
    setSaving(true);
    const { error } = await supabase.from('invoices').insert({
      tenant_id: appUser.tenant_id,
      customer_id: form.customer_id || null, customer_name: form.customer_name || null,
      items, subtotal, discount: discountAmt, tax_amount: taxAmt, total: grandTotal,
      due_date: form.due_date || null, notes: form.notes || null,
      status: 'unpaid', created_by: appUser.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Invoice created');
    setOpen(false); load();
  };

  const recordPayment = async () => {
    if (!payInvoice || !appUser?.tenant_id) return;
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > payInvoice.balance_due + 0.01) { toast.error(`Amount exceeds balance due (${fmt(payInvoice.balance_due)})`); return; }
    const { error } = await supabase.from('invoice_payments').insert({
      invoice_id: payInvoice.id, tenant_id: appUser.tenant_id,
      amount, payment_method: payForm.method, reference: payForm.reference || null,
      notes: payForm.notes || null, created_by: appUser.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Payment recorded');
    loadPayments(payInvoice.id);
    // refresh invoice
    const { data } = await supabase.from('invoices').select('*').eq('id', payInvoice.id).single();
    if (data) setPayInvoice(data as Invoice);
    load();
  };

  const deletePayment = async (payId: string) => {
    if (!confirm('Remove this payment?')) return;
    await supabase.from('invoice_payments').delete().eq('id', payId);
    toast.success('Payment removed');
    if (payInvoice) { loadPayments(payInvoice.id); load(); }
  };

  const voidInvoice = async (id: string) => {
    if (!confirm('Void this invoice?')) return;
    await supabase.from('invoices').update({ status: 'void', updated_at: new Date().toISOString() }).eq('id', id);
    toast.success('Invoice voided'); load();
  };

  const printInvoice = (inv: Invoice) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const biz = appUser?.tenant?.business_name ?? 'Business';
    w.document.write(`<html><head><title>${inv.invoice_number}</title><style>
      body{font-family:sans-serif;padding:24px;max-width:680px;margin:0 auto}
      h1{font-size:20px}table{width:100%;border-collapse:collapse}
      th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left}
      th{background:#f8fafc}.total{font-weight:700}
    </style></head><body>
      <h1>${biz}</h1><h2>Invoice ${inv.invoice_number}</h2>
      <p>Customer: ${inv.customer_name ?? '—'} | Date: ${new Date(inv.created_at).toLocaleDateString()} | Due: ${inv.due_date ?? '—'}</p>
      <table><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr>
      ${inv.items.map(i => `<tr><td>${i.description}</td><td>${i.qty}</td><td>${i.unit_price.toFixed(2)}</td><td>${i.total.toFixed(2)}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">Subtotal</td><td>${inv.subtotal.toFixed(2)}</td></tr>
      <tr><td colspan="3">Tax</td><td>${inv.tax_amount.toFixed(2)}</td></tr>
      <tr class="total"><td colspan="3">TOTAL</td><td>${inv.total.toFixed(2)}</td></tr>
      <tr><td colspan="3">Paid</td><td>${inv.amount_paid.toFixed(2)}</td></tr>
      <tr class="total"><td colspan="3">Balance Due</td><td>${inv.balance_due.toFixed(2)}</td></tr>
      </table>${inv.notes ? `<p><b>Notes:</b> ${inv.notes}</p>` : ''}</body></html>`);
    w.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Invoices</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        {canEdit && <Button onClick={() => { setForm({ customer_id:'',customer_name:'',notes:'',due_date:'',discount:'0' }); setItems([{...EMPTY_ITEM}]); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-1"><Plus className="w-4 h-4" />New Invoice</Button>}
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className={`${inp} pl-9`} placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No invoices yet.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">
                {['#','Customer','Date','Due','Total','Paid','Balance','Status','Actions'].map(h =>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>
                )}
              </tr></thead>
              <tbody>{invoices.map(inv => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono font-semibold text-blue-700">{inv.invoice_number}</td>
                  <td className="py-2 px-3 text-slate-700">{inv.customer_name || '—'}</td>
                  <td className="py-2 px-3 text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="py-2 px-3 text-slate-500">{inv.due_date || '—'}</td>
                  <td className="py-2 px-3 font-semibold">{fmt(inv.total)}</td>
                  <td className="py-2 px-3 text-green-700">{fmt(inv.amount_paid)}</td>
                  <td className="py-2 px-3 text-red-700 font-medium">{fmt(Math.max(0, inv.balance_due))}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>{inv.status}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewing(inv)} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                      {canEdit && inv.status !== 'paid' && inv.status !== 'void' && (
                        <button onClick={() => openPay(inv)} className="p-1 hover:bg-green-50 rounded text-green-600" title="Record Payment"><CheckCircle className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => printInvoice(inv)} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Print"><Printer className="w-4 h-4" /></button>
                      {appUser?.role === 'owner' && inv.status !== 'void' && (
                        <button onClick={() => voidInvoice(inv.id)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Void"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {total > PAGE && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>Showing {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Customer</Label>
                <select className={`w-full ${inp}`} value={form.customer_id}
                  onChange={e => { const c = customers.find(c => c.id === e.target.value); setForm(f => ({ ...f, customer_id: e.target.value, customer_name: c?.name ?? '' })); }}>
                  <option value="">— Walk-in —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Due Date</Label><Input type="date" className={inp} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Items</Label><Button variant="outline" size="sm" onClick={() => setItems(p => [...p, { ...EMPTY_ITEM }])}><Plus className="w-3 h-3 mr-1" />Add Row</Button></div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600 min-w-[180px]">Description</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-20">Qty</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-28">Unit Price</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-24">Total</th>
                    <th className="w-10"></th>
                  </tr></thead>
                  <tbody>{items.map((it, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-1 px-2">
                        <Input list={`inv-prod-${idx}`} className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2" value={it.description}
                          onChange={e => { const p = products.find(p => p.name === e.target.value); if (p) { setItem(idx,'description',p.name); setItem(idx,'unit_price',p.price); } else setItem(idx,'description',e.target.value); }} />
                        <datalist id={`inv-prod-${idx}`}>{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                      </td>
                      <td className="py-1 px-2"><Input type="number" min="1" className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-16" value={it.qty} onChange={e => setItem(idx,'qty',e.target.value)} /></td>
                      <td className="py-1 px-2"><Input type="number" min="0" step="0.01" className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-24" value={it.unit_price} onChange={e => setItem(idx,'unit_price',e.target.value)} /></td>
                      <td className="py-1 px-2 font-semibold text-slate-700">{fmt(it.total)}</td>
                      <td className="py-1 px-1"><button onClick={() => setItems(p => p.filter((_,j) => j !== idx))} disabled={items.length === 1} className="p-1 hover:bg-red-50 rounded text-red-400 disabled:opacity-30"><X className="w-3 h-3" /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Notes</Label><Textarea className="bg-slate-50 border-slate-200 rounded-xl" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between items-center gap-2"><span className="text-slate-500">Discount</span><Input type="number" min="0" className="h-7 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-28 text-right" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} /></div>
                <div className="flex justify-between"><span className="text-slate-500">Tax ({taxRate}%)</span><span>{fmt(taxAmt)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold text-base"><span>Total</span><span className="text-blue-700">{fmt(grandTotal)}</span></div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create Invoice'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      {payInvoice && (
        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Payment — {payInvoice.invoice_number}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between text-sm bg-slate-50 rounded-xl p-3">
                <span className="text-slate-500">Invoice Total</span><span className="font-bold">{fmt(payInvoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm bg-orange-50 rounded-xl p-3">
                <span className="text-orange-600">Balance Due</span><span className="font-bold text-orange-700">{fmt(Math.max(0, payInvoice.balance_due))}</span>
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" min="0" step="0.01" className={inp} value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Payment Method</Label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {PAY_METHODS.map(m => (
                    <button key={m.key} onClick={() => setPayForm(f => ({ ...f, method: m.key }))}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${payForm.method === m.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      <m.icon className="w-3.5 h-3.5" />{m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label>Reference (optional)</Label><Input className={inp} value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="Mpesa code, cheque no…" /></div>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={recordPayment}><CheckCircle className="w-4 h-4 mr-1" />Record Payment</Button>

              {payments.length > 0 && (
                <div>
                  <CardTitle className="text-sm mb-2 text-slate-600">Payment History</CardTitle>
                  <div className="space-y-1">
                    {payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-700">{fmt(p.amount)}</span>
                          <span className="text-slate-400 ml-2">via {p.payment_method}</span>
                          {p.reference && <span className="text-slate-400 ml-2">({p.reference})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">{new Date(p.paid_at).toLocaleDateString()}</span>
                          {appUser?.role === 'owner' && <button onClick={() => deletePayment(p.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><X className="w-3 h-3" /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Dialog */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{viewing.invoice_number}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-4 text-slate-600">
                <span><b>Customer:</b> {viewing.customer_name || '—'}</span>
                <span><b>Due:</b> {viewing.due_date || '—'}</span>
                <span><b>Status:</b> <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[viewing.status]}`}>{viewing.status}</span></span>
              </div>
              <table className="w-full border border-slate-200 rounded-xl overflow-hidden whitespace-nowrap">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Description</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Price</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Total</th>
                </tr></thead>
                <tbody>{viewing.items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-2 px-3">{it.description}</td>
                    <td className="py-2 px-3 text-right">{it.qty}</td>
                    <td className="py-2 px-3 text-right">{fmt(it.unit_price)}</td>
                    <td className="py-2 px-3 text-right font-medium">{fmt(it.total)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="text-right space-y-1">
                <div className="flex justify-end gap-8"><span className="text-slate-500">Subtotal</span><span>{fmt(viewing.subtotal)}</span></div>
                <div className="flex justify-end gap-8"><span className="text-slate-500">Tax</span><span>{fmt(viewing.tax_amount)}</span></div>
                <div className="flex justify-end gap-8 font-bold text-base border-t pt-2"><span>Total</span><span className="text-blue-700">{fmt(viewing.total)}</span></div>
                <div className="flex justify-end gap-8 text-green-700"><span>Paid</span><span>{fmt(viewing.amount_paid)}</span></div>
                <div className="flex justify-end gap-8 text-red-700 font-bold"><span>Balance Due</span><span>{fmt(Math.max(0, viewing.balance_due))}</span></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => printInvoice(viewing)}><Printer className="w-4 h-4 mr-1" />Print</Button>
                {canEdit && viewing.status !== 'paid' && viewing.status !== 'void' && (
                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setViewing(null); openPay(viewing); }}><CheckCircle className="w-4 h-4 mr-1" />Record Payment</Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
