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
  Search, Plus, ShoppingBag, Eye, Trash2, Package,
  ChevronLeft, ChevronRight, X, CheckCircle
} from 'lucide-react';

interface PurchaseItem { product_id: string; name: string; qty: number; unit_cost: number; total: number; }
interface Purchase {
  id: string; tenant_id: string; purchase_number: string; supplier_id?: string; supplier_name?: string;
  items: PurchaseItem[]; subtotal: number; discount: number; tax_amount: number; total: number;
  amount_paid: number; payment_method: string; purchase_date: string; reference?: string;
  notes?: string; status: string; created_at: string;
}
interface Supplier { id: string; name: string; }
interface Product { id: string; name: string; buying_cost: number; }

const PAGE = 15;
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inp = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-secondary text-muted-foreground', ordered: 'bg-accent text-primary',
  received: 'bg-green-100 text-green-700', partial: 'bg-orange-100 text-orange-700', cancelled: 'bg-red-100 text-red-700',
};
const PAY_METHODS = ['cash','mpesa','card','bank_transfer','credit'];
const EMPTY_ITEM: PurchaseItem = { product_id: '', name: '', qty: 1, unit_cost: 0, total: 0 };

export default function OWPurchases() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const canEdit = appUser?.role === 'owner' || (appUser?.role as string) === 'manager';
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Purchase | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ supplier_id:'', supplier_name:'', payment_method:'cash', purchase_date:new Date().toISOString().slice(0,10), reference:'', notes:'', discount:'0', amount_paid:'', status:'received' });
  const [items, setItems] = useState<PurchaseItem[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const taxRate = appUser?.tenant?.tax_rate ?? 0;

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discAmt = parseFloat(form.discount) || 0;
  const taxAmt = (subtotal - discAmt) * (taxRate / 100);
  const grandTotal = subtotal - discAmt + taxAmt;

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('purchases').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id).order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`purchase_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setPurchases((data ?? []) as Purchase[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  const loadLookups = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    const [s, p] = await Promise.all([
      supabase.from('suppliers').select('id,name').eq('tenant_id', appUser.tenant_id).order('name').limit(200),
      supabase.from('products').select('id,name,buying_cost').eq('tenant_id', appUser.tenant_id).order('name').limit(500),
    ]);
    setSuppliers((s.data ?? []) as Supplier[]);
    setProducts((p.data ?? []) as Product[]);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  const setItem = (idx: number, field: keyof PurchaseItem, val: string | number) => {
    setItems(prev => {
      const arr = [...prev];
      const it = { ...arr[idx], [field]: typeof val === 'string' && field !== 'name' && field !== 'product_id' ? Number(val) : val };
      if (field === 'name') {
        const p = products.find(p => p.name === val);
        if (p) { it.product_id = p.id; it.unit_cost = p.buying_cost; it.total = it.qty * p.buying_cost; }
      }
      if (field === 'qty' || field === 'unit_cost') it.total = it.qty * it.unit_cost;
      arr[idx] = it;
      return arr;
    });
  };

  const save = async () => {
    if (!appUser?.tenant_id) return;
    if (!items.some(i => i.name && i.total > 0)) { toast.error('Add at least one item'); return; }
    setSaving(true);
    const { data: pur, error } = await supabase.from('purchases').insert({
      tenant_id: appUser.tenant_id, supplier_id: form.supplier_id || null,
      supplier_name: form.supplier_name || null, items, subtotal, discount: discAmt,
      tax_amount: taxAmt, total: grandTotal, amount_paid: parseFloat(form.amount_paid) || grandTotal,
      payment_method: form.payment_method, purchase_date: form.purchase_date,
      reference: form.reference || null, notes: form.notes || null,
      status: form.status, created_by: appUser.id,
    }).select().single();
    if (error) { toast.error(error.message); setSaving(false); return; }

    // If received, update stock via RPC
    if (form.status === 'received' && pur) {
      const { error: rpcErr } = await supabase.rpc('receive_purchase', { p_purchase_id: pur.id });
      if (rpcErr) toast.warning('Purchase saved but stock update failed: ' + rpcErr.message);
      else toast.success('Purchase received — stock updated');
    } else {
      toast.success('Purchase saved');
    }
    setSaving(false);
    setOpen(false); load();
  };

  const markReceived = async (p: Purchase) => {
    await supabase.from('purchases').update({ status: 'received', updated_at: new Date().toISOString() }).eq('id', p.id);
    const { error } = await supabase.rpc('receive_purchase', { p_purchase_id: p.id });
    if (error) toast.error('Stock update failed: ' + error.message);
    else toast.success('Marked as received — stock updated');
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this purchase?')) return;
    await supabase.from('purchases').delete().eq('id', id);
    toast.success('Deleted'); load();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Purchases</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        {canEdit && <Button onClick={() => { setForm({supplier_id:'',supplier_name:'',payment_method:'cash',purchase_date:new Date().toISOString().slice(0,10),reference:'',notes:'',discount:'0',amount_paid:'',status:'received'}); setItems([{...EMPTY_ITEM}]); setOpen(true); }} className="bg-primary hover:opacity-90 text-white h-9 gap-1"><Plus className="w-4 h-4" />New Purchase</Button>}
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className={`${inp} pl-9`} placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No purchases yet.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-border">
                {['#','Supplier','Date','Total','Paid','Status','Actions'].map(h=>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                )}
              </tr></thead>
              <tbody>{purchases.map(p => (
                <tr key={p.id} className="border-b border-border hover:bg-card">
                  <td className="py-2 px-3 font-mono font-semibold text-primary">{p.purchase_number}</td>
                  <td className="py-2 px-3 text-foreground">{p.supplier_name || '—'}</td>
                  <td className="py-2 px-3 text-muted-foreground">{p.purchase_date}</td>
                  <td className="py-2 px-3 font-semibold">{fmt(p.total)}</td>
                  <td className="py-2 px-3 text-green-700">{fmt(p.amount_paid)}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[p.status]??'bg-secondary text-muted-foreground'}`}>{p.status}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewing(p)} className="p-1 hover:bg-accent rounded text-primary" title="View"><Eye className="w-4 h-4" /></button>
                      {canEdit && p.status !== 'received' && p.status !== 'cancelled' && (
                        <button onClick={() => markReceived(p)} className="p-1 hover:bg-green-50 rounded text-green-600" title="Mark Received"><CheckCircle className="w-4 h-4" /></button>
                      )}
                      {appUser?.role === 'owner' && (
                        <button onClick={() => del(p.id)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {total > PAGE && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Showing {page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label>Supplier</Label>
                <select className={`w-full ${inp}`} value={form.supplier_id} onChange={e=>{const s=suppliers.find(s=>s.id===e.target.value);setForm(f=>({...f,supplier_id:e.target.value,supplier_name:s?.name??''}));}}>
                  <option value="">— Walk-in / No supplier —</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><Label>Date</Label><Input type="date" className={inp} value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))} /></div>
              <div>
                <Label>Status</Label>
                <select className={`w-full ${inp}`} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  {['draft','ordered','received'].map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Items</Label>
                <Button variant="outline" size="sm" onClick={()=>setItems(p=>[...p,{...EMPTY_ITEM}])}><Plus className="w-3 h-3 mr-1" />Add Row</Button>
              </div>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="bg-card border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[160px]">Product</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground w-20">Qty</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground w-28">Unit Cost</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground w-24">Total</th>
                    <th className="w-10"></th>
                  </tr></thead>
                  <tbody>{items.map((it,idx)=>(
                    <tr key={idx} className="border-b border-border">
                      <td className="py-1 px-2">
                        <Input list={`pur-prod-${idx}`} className="h-8 text-sm bg-card border-border rounded-lg px-2" value={it.name}
                          onChange={e=>setItem(idx,'name',e.target.value)} />
                        <datalist id={`pur-prod-${idx}`}>{products.map(p=><option key={p.id} value={p.name}/>)}</datalist>
                      </td>
                      <td className="py-1 px-2"><Input type="number" min="1" className="h-8 text-sm bg-card border-border rounded-lg px-2 w-16" value={it.qty} onChange={e=>setItem(idx,'qty',e.target.value)}/></td>
                      <td className="py-1 px-2"><Input type="number" min="0" step="0.01" className="h-8 text-sm bg-card border-border rounded-lg px-2 w-24" value={it.unit_cost} onChange={e=>setItem(idx,'unit_cost',e.target.value)}/></td>
                      <td className="py-1 px-2 font-semibold">{fmt(it.total)}</td>
                      <td className="py-1 px-1"><button onClick={()=>setItems(p=>p.filter((_,j)=>j!==idx))} disabled={items.length===1} className="p-1 hover:bg-red-50 rounded text-red-400 disabled:opacity-30"><X className="w-3 h-3"/></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><Label>Payment Method</Label>
                <select className={`w-full ${inp}`} value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))}>
                  {PAY_METHODS.map(m=><option key={m} value={m} className="capitalize">{m.replace('_',' ')}</option>)}
                </select>
              </div>
              <div><Label>Amount Paid</Label><Input type="number" min="0" step="0.01" className={inp} placeholder={fmt(grandTotal)} value={form.amount_paid} onChange={e=>setForm(f=>({...f,amount_paid:e.target.value}))}/></div>
              <div><Label>Reference</Label><Input className={inp} value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))}/></div>
            </div>
            <div className="flex gap-4 text-sm items-end justify-end flex-wrap">
              <div className="space-y-1 text-right min-w-[160px]">
                <div className="flex justify-between gap-8"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between gap-8 items-center"><span className="text-muted-foreground">Discount</span><Input type="number" min="0" className="h-7 text-sm bg-card border-border rounded-lg px-2 w-24 text-right" value={form.discount} onChange={e=>setForm(f=>({...f,discount:e.target.value}))}/></div>
                <div className="flex justify-between gap-8"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span>{fmt(taxAmt)}</span></div>
                <div className="flex justify-between gap-8 font-bold text-base border-t pt-2"><span>Total</span><span className="text-primary">{fmt(grandTotal)}</span></div>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea className="bg-card border-border rounded-xl" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button className="bg-primary hover:opacity-90 text-white" onClick={save} disabled={saving}>{saving?'Saving…':'Save Purchase'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={()=>setViewing(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{viewing.purchase_number}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <span><b>Supplier:</b> {viewing.supplier_name||'—'}</span>
                <span><b>Date:</b> {viewing.purchase_date}</span>
                <span><b>Status:</b> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[viewing.status]}`}>{viewing.status}</span></span>
              </div>
              <table className="w-full border border-border rounded-xl overflow-hidden whitespace-nowrap">
                <thead className="bg-card"><tr>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Product</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Unit Cost</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Total</th>
                </tr></thead>
                <tbody>{viewing.items.map((it,i)=>(
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 px-3">{it.name}</td>
                    <td className="py-2 px-3 text-right">{it.qty}</td>
                    <td className="py-2 px-3 text-right">{fmt(it.unit_cost)}</td>
                    <td className="py-2 px-3 text-right font-medium">{fmt(it.total)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="text-right space-y-1">
                <div className="flex justify-end gap-8"><span className="text-muted-foreground">Tax</span><span>{fmt(viewing.tax_amount)}</span></div>
                <div className="flex justify-end gap-8 font-bold text-base border-t pt-2"><span>Total</span><span className="text-primary">{fmt(viewing.total)}</span></div>
                <div className="flex justify-end gap-8 text-green-700"><span>Paid</span><span>{fmt(viewing.amount_paid)}</span></div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}