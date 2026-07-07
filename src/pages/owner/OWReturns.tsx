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
  Search, Plus, RefreshCw, Eye, Trash2, CheckCircle, X,
  ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react';

interface ReturnItem { product_id: string; name: string; qty: number; unit_price: number; total: number; }
interface SaleReturn {
  id: string; tenant_id: string; return_number: string; sale_id?: string; customer_id?: string;
  return_type: string; items: ReturnItem[]; subtotal: number; tax_amount: number; total: number;
  refund_method: string; reason?: string; notes?: string; status: string; approved_at?: string; created_at: string;
}
interface Sale { id: string; transaction_id?: string; receipt_number?: string; total: number; items: Array<{ product_id: string; name: string; qty: number; price: number }>; created_at: string; }
interface Product { id: string; name: string; price: number; buying_cost: number; }

const PAGE = 15;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
};
const RETURN_TYPES = ['refund', 'exchange', 'store_credit'];
const REFUND_METHODS = ['cash', 'mpesa', 'card', 'store_credit'];

export default function OWReturns() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const canApprove = appUser?.role === 'owner' || appUser?.role === 'manager';
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<SaleReturn | null>(null);
  const [saleSearch, setSaleSearch] = useState('');
  const [saleResults, setSaleResults] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ return_type: 'refund', refund_method: 'cash', reason: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const taxRate = appUser?.tenant?.tax_rate ?? 0;

  const subtotal = returnItems.reduce((s, i) => s + i.total, 0);
  const taxAmt = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmt;

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('sales_returns').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id).order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`return_number.ilike.%${search}%,reason.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setReturns((data ?? []) as SaleReturn[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  const loadProducts = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    const { data } = await supabase.from('products').select('id,name,price,buying_cost')
      .eq('tenant_id', appUser.tenant_id).order('name').limit(500);
    setProducts((data ?? []) as Product[]);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const searchSales = async () => {
    if (!appUser?.tenant_id || !saleSearch.trim()) return;
    const { data } = await supabase.from('sales').select('*')
      .eq('tenant_id', appUser.tenant_id)
      .or(`receipt_number.ilike.%${saleSearch}%,transaction_id.ilike.%${saleSearch}%`)
      .order('created_at', { ascending: false }).limit(10);
    setSaleResults((data ?? []) as Sale[]);
  };

  const selectSale = (s: Sale) => {
    setSelectedSale(s);
    setSaleResults([]);
    // Pre-populate return items from sale items
    const items: ReturnItem[] = (s.items ?? []).map(si => ({
      product_id: si.product_id,
      name: si.name,
      qty: si.qty,
      unit_price: si.price,
      total: si.qty * si.price,
    }));
    setReturnItems(items.length ? items : [{ product_id: '', name: '', qty: 1, unit_price: 0, total: 0 }]);
  };

  const setRetItem = (idx: number, field: keyof ReturnItem, val: string | number) => {
    setReturnItems(prev => {
      const arr = [...prev];
      const it = { ...arr[idx], [field]: typeof val === 'string' && field !== 'name' && field !== 'product_id' ? Number(val) : val };
      if (field === 'qty' || field === 'unit_price') it.total = it.qty * it.unit_price;
      // auto-fill from product list when name is selected
      if (field === 'name') {
        const p = products.find(p => p.name === val);
        if (p) { it.product_id = p.id; it.unit_price = p.price; it.total = it.qty * p.price; }
      }
      arr[idx] = it;
      return arr;
    });
  };

  const save = async () => {
    if (!appUser?.tenant_id) return;
    if (!returnItems.some(i => i.name && i.total > 0)) { toast.error('Add at least one item'); return; }
    setSaving(true);
    const { error } = await supabase.from('sales_returns').insert({
      tenant_id: appUser.tenant_id,
      sale_id: selectedSale?.id ?? null,
      return_type: form.return_type,
      items: returnItems,
      subtotal, tax_amount: taxAmt, total: grandTotal,
      refund_method: form.refund_method,
      reason: form.reason || null, notes: form.notes || null,
      status: 'pending', created_by: appUser.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Return created — pending approval');
    setOpen(false); load();
  };

  const approve = async (id: string) => {
    const { error } = await supabase.from('sales_returns').update({
      status: 'approved', approved_by: appUser?.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    // Apply stock reversal via RPC
    const { error: rpcErr } = await supabase.rpc('apply_stock_return', { p_return_id: id });
    if (rpcErr) { toast.error('Approved but stock reversal failed: ' + rpcErr.message); }
    else toast.success('Return approved & stock restored');
    load();
  };

  const reject = async (id: string) => {
    await supabase.from('sales_returns').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
    toast.success('Return rejected'); load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this return?')) return;
    await supabase.from('sales_returns').delete().eq('id', id);
    toast.success('Deleted'); load();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Sales Returns</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        <Button onClick={() => { setSelectedSale(null); setSaleSearch(''); setSaleResults([]); setReturnItems([{product_id:'',name:'',qty:1,unit_price:0,total:0}]); setForm({return_type:'refund',refund_method:'cash',reason:'',notes:''}); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-1">
          <Plus className="w-4 h-4" />New Return
        </Button>
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
          ) : returns.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><RefreshCw className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No returns yet.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">
                {['#','Type','Total','Refund Method','Reason','Status','Date','Actions'].map(h =>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>
                )}
              </tr></thead>
              <tbody>{returns.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono font-semibold text-blue-700">{r.return_number}</td>
                  <td className="py-2 px-3 capitalize text-slate-700">{r.return_type}</td>
                  <td className="py-2 px-3 font-semibold">{fmt(r.total)}</td>
                  <td className="py-2 px-3 capitalize text-slate-500">{r.refund_method}</td>
                  <td className="py-2 px-3 text-slate-500 max-w-[120px] truncate">{r.reason || '—'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                  </td>
                  <td className="py-2 px-3 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewing(r)} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                      {canApprove && r.status === 'pending' && <>
                        <button onClick={() => approve(r.id)} className="p-1 hover:bg-green-50 rounded text-green-600" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => reject(r.id)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Reject"><X className="w-4 h-4" /></button>
                      </>}
                      {appUser?.role === 'owner' && r.status === 'pending' && (
                        <button onClick={() => del(r.id)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
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

      {/* Create Return Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Sales Return</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Find original sale */}
            <div>
              <Label>Find Original Sale (optional)</Label>
              <div className="flex gap-2 mt-1">
                <Input className={`${inp} flex-1`} placeholder="Receipt # or Transaction ID…" value={saleSearch} onChange={e => setSaleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchSales()} />
                <Button variant="outline" onClick={searchSales}>Search</Button>
              </div>
              {saleResults.length > 0 && (
                <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                  {saleResults.map(s => (
                    <button key={s.id} onClick={() => selectSale(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-700">{s.receipt_number || s.transaction_id || s.id.slice(0,8)}</span>
                      <span className="text-slate-500">{fmt(s.total)} — {new Date(s.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedSale && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Sale: {selectedSale.receipt_number || selectedSale.id.slice(0,8)} — {fmt(selectedSale.total)}</span>
                  <button onClick={() => setSelectedSale(null)} className="ml-auto"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Return Type</Label>
                <select className={`w-full ${inp}`} value={form.return_type} onChange={e => setForm(f => ({ ...f, return_type: e.target.value }))}>
                  {RETURN_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <Label>Refund Method</Label>
                <select className={`w-full ${inp}`} value={form.refund_method} onChange={e => setForm(f => ({ ...f, refund_method: e.target.value }))}>
                  {REFUND_METHODS.map(m => <option key={m} value={m} className="capitalize">{m.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2"><Label>Return Items</Label>
                <Button variant="outline" size="sm" onClick={() => setReturnItems(p => [...p, {product_id:'',name:'',qty:1,unit_price:0,total:0}])}><Plus className="w-3 h-3 mr-1" />Add Row</Button>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600 min-w-[160px]">Product</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-20">Qty</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-28">Unit Price</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-24">Total</th>
                    <th className="w-10"></th>
                  </tr></thead>
                  <tbody>{returnItems.map((it, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-1 px-2">
                        <Input list={`ret-prod-${idx}`} className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2" value={it.name}
                          onChange={e => setRetItem(idx, 'name', e.target.value)} />
                        <datalist id={`ret-prod-${idx}`}>{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                      </td>
                      <td className="py-1 px-2"><Input type="number" min="1" className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-16" value={it.qty} onChange={e => setRetItem(idx,'qty',e.target.value)} /></td>
                      <td className="py-1 px-2"><Input type="number" min="0" step="0.01" className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-24" value={it.unit_price} onChange={e => setRetItem(idx,'unit_price',e.target.value)} /></td>
                      <td className="py-1 px-2 font-semibold">{fmt(it.total)}</td>
                      <td className="py-1 px-1"><button onClick={() => setReturnItems(p => p.filter((_,j)=>j!==idx))} disabled={returnItems.length===1} className="p-1 hover:bg-red-50 rounded text-red-400 disabled:opacity-30"><X className="w-3 h-3" /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Reason</Label><Input className={inp} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Defective, wrong item…" /></div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tax ({taxRate}%)</span><span>{fmt(taxAmt)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Refund Total</span><span className="text-red-600">{fmt(grandTotal)}</span></div>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea className="bg-slate-50 border-slate-200 rounded-xl" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} disabled={saving}>{saving ? 'Submitting…' : 'Submit Return'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Return */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{viewing.return_number}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <span><b>Type:</b> {viewing.return_type}</span>
                <span><b>Refund:</b> {viewing.refund_method}</span>
                <span><b>Status:</b> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[viewing.status]}`}>{viewing.status}</span></span>
                <span><b>Date:</b> {new Date(viewing.created_at).toLocaleDateString()}</span>
              </div>
              {viewing.reason && <p className="bg-yellow-50 border border-yellow-200 rounded-xl p-2 text-yellow-800"><AlertTriangle className="w-3 h-3 inline mr-1" />{viewing.reason}</p>}
              <table className="w-full border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Product</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Price</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Total</th>
                </tr></thead>
                <tbody>{viewing.items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-2 px-3">{it.name}</td>
                    <td className="py-2 px-3 text-right">{it.qty}</td>
                    <td className="py-2 px-3 text-right">{fmt(it.unit_price)}</td>
                    <td className="py-2 px-3 text-right font-medium">{fmt(it.total)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="text-right space-y-1">
                <div className="flex justify-end gap-8"><span className="text-slate-500">Tax</span><span>{fmt(viewing.tax_amount)}</span></div>
                <div className="flex justify-end gap-8 font-bold text-base border-t pt-2"><span>Refund Total</span><span className="text-red-600">{fmt(viewing.total)}</span></div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
