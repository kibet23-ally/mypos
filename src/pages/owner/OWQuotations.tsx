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
  Search, Plus, ClipboardList, Edit2, Trash2, Eye, Copy,
  FileText, Send, Printer, ChevronLeft, ChevronRight, CheckCircle, X
} from 'lucide-react';

interface QuoteItem { product_id?: string; description: string; qty: number; unit_price: number; total: number; }
interface Quotation {
  id: string; tenant_id: string; quote_number: string; customer_id?: string; customer_name?: string;
  items: QuoteItem[]; subtotal: number; discount: number; tax_amount: number; total: number;
  status: string; valid_until?: string; notes?: string; created_at: string;
}
interface Customer { id: string; name: string; phone?: string; email?: string; }
interface Product { id: string; name: string; price: number; }

const PAGE = 15;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
  converted: 'bg-purple-100 text-purple-700',
};
const EMPTY_ITEM: QuoteItem = { description: '', qty: 1, unit_price: 0, total: 0 };
const EMPTY_FORM = { customer_id: '', customer_name: '', notes: '', valid_until: '', discount: '0' };

export default function OWQuotations() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const canEdit = appUser?.role === 'owner' || appUser?.role === 'manager';
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [viewing, setViewing] = useState<Quotation | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState<QuoteItem[]>([{ ...EMPTY_ITEM }]);
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
    let q = supabase.from('quotations').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id).order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`quote_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setQuotes((data ?? []) as Quotation[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  const loadCustomers = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    const { data } = await supabase.from('customers').select('id,name,phone,email')
      .eq('tenant_id', appUser.tenant_id).order('name').limit(200);
    setCustomers((data ?? []) as Customer[]);
  }, [appUser?.tenant_id]);

  const loadProducts = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    const { data } = await supabase.from('products').select('id,name,price')
      .eq('tenant_id', appUser.tenant_id).order('name').limit(500);
    setProducts((data ?? []) as Product[]);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCustomers(); loadProducts(); }, [loadCustomers, loadProducts]);

  const openCreate = () => {
    setEditing(null); setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); setOpen(true);
  };
  const openEdit = (q: Quotation) => {
    setEditing(q);
    setForm({ customer_id: q.customer_id ?? '', customer_name: q.customer_name ?? '', notes: q.notes ?? '', valid_until: q.valid_until ?? '', discount: String(q.discount) });
    setItems(q.items.length ? q.items : [{ ...EMPTY_ITEM }]);
    setOpen(true);
  };

  const setItem = (idx: number, field: keyof QuoteItem, val: string | number) => {
    setItems(prev => {
      const arr = [...prev];
      const it = { ...arr[idx], [field]: field === 'description' ? val : Number(val) };
      if (field === 'qty' || field === 'unit_price') it.total = it.qty * it.unit_price;
      arr[idx] = it;
      return arr;
    });
  };
  const addItem = () => setItems(p => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, j) => j !== i));

  const save = async () => {
    if (!appUser?.tenant_id) return;
    if (!items.some(i => i.description && i.total > 0)) { toast.error('Add at least one item'); return; }
    setSaving(true);
    const payload = {
      tenant_id: appUser.tenant_id,
      customer_id: form.customer_id || null,
      customer_name: form.customer_name || null,
      items, subtotal, discount: discountAmt, tax_amount: taxAmt, total: grandTotal,
      valid_until: form.valid_until || null, notes: form.notes || null,
      status: editing?.status ?? 'draft', created_by: appUser.id,
    };
    const { error } = editing
      ? await supabase.from('quotations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      : await supabase.from('quotations').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Quotation updated' : 'Quotation created');
    setOpen(false); load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('quotations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status → ${status}`); load();
  };

  const duplicate = async (q: Quotation) => {
    if (!appUser?.tenant_id) return;
    const { error } = await supabase.from('quotations').insert({
      tenant_id: appUser.tenant_id, customer_id: q.customer_id, customer_name: q.customer_name,
      items: q.items, subtotal: q.subtotal, discount: q.discount, tax_amount: q.tax_amount, total: q.total,
      notes: q.notes, status: 'draft', created_by: appUser.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Quotation duplicated'); load();
  };

  const convertToInvoice = async (q: Quotation) => {
    if (!appUser?.tenant_id) return;
    const { error: invErr } = await supabase.from('invoices').insert({
      tenant_id: appUser.tenant_id, customer_id: q.customer_id, customer_name: q.customer_name,
      quotation_id: q.id, items: q.items, subtotal: q.subtotal, discount: q.discount,
      tax_amount: q.tax_amount, total: q.total, notes: q.notes, status: 'unpaid',
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), created_by: appUser.id,
    });
    if (invErr) { toast.error(invErr.message); return; }
    await supabase.from('quotations').update({ status: 'converted', updated_at: new Date().toISOString() }).eq('id', q.id);
    toast.success('Converted to Invoice'); load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this quotation?')) return;
    await supabase.from('quotations').delete().eq('id', id);
    toast.success('Deleted'); load();
  };

  const printQuote = (q: Quotation) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const biz = appUser?.tenant?.business_name ?? 'Business';
    w.document.write(`<html><head><title>${q.quote_number}</title><style>
      body{font-family:sans-serif;padding:24px;max-width:680px;margin:0 auto}
      h1{font-size:22px}table{width:100%;border-collapse:collapse}
      th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left}
      th{background:#f8fafc}.total{font-weight:700}
    </style></head><body>
      <h1>${biz}</h1><h2>Quotation ${q.quote_number}</h2>
      <p>Customer: ${q.customer_name ?? '—'} | Date: ${new Date(q.created_at).toLocaleDateString()} | Valid Until: ${q.valid_until ?? '—'}</p>
      <table><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
      ${q.items.map(i => `<tr><td>${i.description}</td><td>${i.qty}</td><td>${i.unit_price.toFixed(2)}</td><td>${i.total.toFixed(2)}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">Subtotal</td><td>${q.subtotal.toFixed(2)}</td></tr>
      <tr><td colspan="3">Discount</td><td>-${q.discount.toFixed(2)}</td></tr>
      <tr><td colspan="3">Tax</td><td>${q.tax_amount.toFixed(2)}</td></tr>
      <tr class="total"><td colspan="3">TOTAL</td><td>${q.total.toFixed(2)}</td></tr>
      </table>${q.notes ? `<p><b>Notes:</b> ${q.notes}</p>` : ''}</body></html>`);
    w.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Quotations</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        {canEdit && <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-1"><Plus className="w-4 h-4" />New Quote</Button>}
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className={`${inp} pl-9`} placeholder="Search by number or customer…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No quotations yet. Create your first one!</p>
            </div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">
                {['#','Customer','Date','Valid Until','Total','Status','Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr></thead>
              <tbody>{quotes.map(q => (
                <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-mono font-semibold text-blue-700">{q.quote_number}</td>
                  <td className="py-2 px-3 text-slate-700">{q.customer_name || <span className="text-slate-400">—</span>}</td>
                  <td className="py-2 px-3 text-slate-500">{new Date(q.created_at).toLocaleDateString()}</td>
                  <td className="py-2 px-3 text-slate-500">{q.valid_until || '—'}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{fmt(q.total)}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[q.status] ?? 'bg-slate-100 text-slate-600'}`}>{q.status}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewing(q)} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                      {canEdit && q.status === 'draft' && <>
                        <button onClick={() => openEdit(q)} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => updateStatus(q.id, 'sent')} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Mark Sent"><Send className="w-4 h-4" /></button>
                      </>}
                      {canEdit && q.status === 'sent' && <>
                        <button onClick={() => updateStatus(q.id, 'accepted')} className="p-1 hover:bg-green-50 rounded text-green-600" title="Accept"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => updateStatus(q.id, 'rejected')} className="p-1 hover:bg-red-50 rounded text-red-500" title="Reject"><X className="w-4 h-4" /></button>
                      </>}
                      {canEdit && q.status === 'accepted' && (
                        <button onClick={() => convertToInvoice(q)} className="p-1 hover:bg-purple-50 rounded text-purple-600" title="Convert to Invoice"><FileText className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => printQuote(q)} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Print"><Printer className="w-4 h-4" /></button>
                      {canEdit && <button onClick={() => duplicate(q)} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Duplicate"><Copy className="w-4 h-4" /></button>}
                      {appUser?.role === 'owner' && <button onClick={() => del(q.id)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>}
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

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.quote_number}` : 'New Quotation'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Customer</Label>
                <select className={`w-full ${inp}`} value={form.customer_id}
                  onChange={e => {
                    const c = customers.find(c => c.id === e.target.value);
                    setForm(f => ({ ...f, customer_id: e.target.value, customer_name: c?.name ?? '' }));
                  }}>
                  <option value="">— Walk-in / No customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="date" className={inp} value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Add Row</Button>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600 min-w-[200px]">Description</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-20">Qty</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-28">Unit Price</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-28">Total</th>
                    <th className="w-10"></th>
                  </tr></thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-1 px-2">
                          <Input list={`products-${idx}`} className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2" value={it.description}
                            onChange={e => {
                              const p = products.find(p => p.name === e.target.value);
                              if (p) { setItem(idx, 'description', p.name); setItem(idx, 'unit_price', p.price); }
                              else setItem(idx, 'description', e.target.value);
                            }} />
                          <datalist id={`products-${idx}`}>{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                        </td>
                        <td className="py-1 px-2"><Input type="number" min="1" className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-16" value={it.qty} onChange={e => setItem(idx, 'qty', e.target.value)} /></td>
                        <td className="py-1 px-2"><Input type="number" min="0" step="0.01" className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-24" value={it.unit_price} onChange={e => setItem(idx, 'unit_price', e.target.value)} /></td>
                        <td className="py-1 px-2 font-semibold text-slate-700">{fmt(it.total)}</td>
                        <td className="py-1 px-1"><button onClick={() => removeItem(idx)} disabled={items.length === 1} className="p-1 hover:bg-red-50 rounded text-red-400 disabled:opacity-30"><X className="w-3 h-3" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Notes</Label>
                <Textarea className="bg-slate-50 border-slate-200 rounded-xl" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Terms, conditions…" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{fmt(subtotal)}</span></div>
                <div className="flex justify-between items-center gap-2"><span className="text-slate-500">Discount</span>
                  <Input type="number" min="0" className="h-7 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-28 text-right" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
                </div>
                <div className="flex justify-between"><span className="text-slate-500">Tax ({taxRate}%)</span><span>{fmt(taxAmt)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-base"><span>Total</span><span className="text-blue-700">{fmt(grandTotal)}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{viewing.quote_number}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-4 text-slate-600">
                <span><b>Customer:</b> {viewing.customer_name || '—'}</span>
                <span><b>Valid Until:</b> {viewing.valid_until || '—'}</span>
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
                <div className="flex justify-end gap-8"><span className="text-slate-500">Discount</span><span>-{fmt(viewing.discount)}</span></div>
                <div className="flex justify-end gap-8"><span className="text-slate-500">Tax</span><span>{fmt(viewing.tax_amount)}</span></div>
                <div className="flex justify-end gap-8 font-bold text-base border-t pt-2"><span>Total</span><span className="text-blue-700">{fmt(viewing.total)}</span></div>
              </div>
              {viewing.notes && <p className="text-slate-600 bg-slate-50 rounded-xl p-3">{viewing.notes}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => printQuote(viewing)}><Printer className="w-4 h-4 mr-1" />Print</Button>
                {canEdit && viewing.status === 'accepted' && (
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { convertToInvoice(viewing); setViewing(null); }}><FileText className="w-4 h-4 mr-1" />Convert to Invoice</Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
