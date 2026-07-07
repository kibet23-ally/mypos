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
  Search, Plus, BookOpen, Eye, Trash2, ChevronLeft, ChevronRight,
  X, CheckCircle, Send, Truck
} from 'lucide-react';

interface POItem { product_id: string; name: string; qty: number; unit_cost: number; total: number; }
interface PurchaseOrder {
  id: string; tenant_id: string; order_number: string; supplier_id?: string; supplier_name?: string;
  items: POItem[]; total: number; po_status: string; discount: number; tax_amount: number;
  expected_date?: string; notes?: string; received_at?: string; created_at: string;
}
interface Supplier { id: string; name: string; }
interface Product { id: string; name: string; buying_cost: number; }

const PAGE = 15;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700', partial: 'bg-orange-100 text-orange-700',
  received: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};
const EMPTY_ITEM: POItem = { product_id: '', name: '', qty: 1, unit_cost: 0, total: 0 };

export default function OWPurchaseOrders() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const canEdit = appUser?.role === 'owner' || appUser?.role === 'manager';
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ supplier_id:'', supplier_name:'', expected_date:'', notes:'', discount:'0' });
  const [items, setItems] = useState<POItem[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const taxRate = appUser?.tenant?.tax_rate ?? 0;

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discAmt = parseFloat(form.discount) || 0;
  const taxAmt = (subtotal - discAmt) * (taxRate / 100);
  const grandTotal = subtotal - discAmt + taxAmt;

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('purchase_orders').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id).order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`order_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setOrders((data ?? []) as PurchaseOrder[]); setTotal(count ?? 0); }
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

  const setItem = (idx: number, field: keyof POItem, val: string | number) => {
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
    const { error } = await supabase.from('purchase_orders').insert({
      tenant_id: appUser.tenant_id, supplier_id: form.supplier_id || null,
      supplier_name: form.supplier_name || null, items, total: grandTotal,
      discount: discAmt, tax_amount: taxAmt, po_status: 'draft',
      expected_date: form.expected_date || null, notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Purchase Order created'); setOpen(false); load();
  };

  const updateStatus = async (id: string, status: string) => {
    const extra = status === 'received' ? { received_at: new Date().toISOString(), received_by: appUser?.id } : {};
    const { error } = await supabase.from('purchase_orders').update({ po_status: status, ...extra, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status → ${status}`);
    if (status === 'received') {
      // Convert PO to purchase and receive stock
      const po = orders.find(o => o.id === id);
      if (po) {
        const { data: pur } = await supabase.from('purchases').insert({
          tenant_id: appUser?.tenant_id, supplier_id: po.supplier_id,
          supplier_name: po.supplier_name, items: po.items,
          subtotal: po.items.reduce((s, i) => s + i.total, 0), discount: po.discount,
          tax_amount: po.tax_amount, total: po.total, amount_paid: 0,
          status: 'received', created_by: appUser?.id,
        }).select().single();
        if (pur) await supabase.rpc('receive_purchase', { p_purchase_id: pur.id });
      }
    }
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this PO?')) return;
    await supabase.from('purchase_orders').delete().eq('id', id);
    toast.success('Deleted'); load();
  };

  const printPO = (po: PurchaseOrder) => {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>${po.order_number}</title><style>body{font-family:sans-serif;padding:24px;max-width:680px;margin:0 auto}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #e2e8f0;text-align:left}th{background:#f8fafc}.total{font-weight:700}</style></head><body>
      <h2>Purchase Order: ${po.order_number}</h2><p>Supplier: ${po.supplier_name??'—'} | Expected: ${po.expected_date??'—'}</p>
      <table><tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr>
      ${po.items.map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.unit_cost.toFixed(2)}</td><td>${i.total.toFixed(2)}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">TOTAL</td><td>${po.total.toFixed(2)}</td></tr></table>
      ${po.notes?`<p><b>Notes:</b> ${po.notes}</p>`:''}</body></html>`);
    w.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Purchase Orders</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        {canEdit && <Button onClick={() => { setForm({supplier_id:'',supplier_name:'',expected_date:'',notes:'',discount:'0'}); setItems([{...EMPTY_ITEM}]); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-1"><Plus className="w-4 h-4" />New PO</Button>}
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className={`${inp} pl-9`} placeholder="Search PO…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No purchase orders yet.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">
                {['PO #','Supplier','Expected','Total','Status','Created','Actions'].map(h=>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>
                )}
              </tr></thead>
              <tbody>{orders.map(o => (
                <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono font-semibold text-blue-700">{o.order_number || o.id.slice(0,8)}</td>
                  <td className="py-2 px-3 text-slate-700">{o.supplier_name||'—'}</td>
                  <td className="py-2 px-3 text-slate-500">{o.expected_date||'—'}</td>
                  <td className="py-2 px-3 font-semibold">{fmt(o.total)}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[o.po_status??'draft']??'bg-slate-100 text-slate-600'}`}>{o.po_status||'draft'}</span>
                  </td>
                  <td className="py-2 px-3 text-slate-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setViewing(o)} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                      {canEdit && o.po_status === 'draft' && <button onClick={()=>updateStatus(o.id,'sent')} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Send"><Send className="w-4 h-4" /></button>}
                      {canEdit && (o.po_status === 'sent' || o.po_status === 'confirmed') && (
                        <button onClick={()=>updateStatus(o.id,'received')} className="p-1 hover:bg-green-50 rounded text-green-600" title="Mark Received"><Truck className="w-4 h-4" /></button>
                      )}
                      <button onClick={()=>printPO(o)} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Print"><BookOpen className="w-4 h-4" /></button>
                      {appUser?.role === 'owner' && o.po_status === 'draft' && (
                        <button onClick={()=>del(o.id)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {total > PAGE && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
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
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Supplier</Label>
                <select className={`w-full ${inp}`} value={form.supplier_id} onChange={e=>{const s=suppliers.find(s=>s.id===e.target.value);setForm(f=>({...f,supplier_id:e.target.value,supplier_name:s?.name??''}));}}>
                  <option value="">— Select supplier —</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><Label>Expected Date</Label><Input type="date" className={inp} value={form.expected_date} onChange={e=>setForm(f=>({...f,expected_date:e.target.value}))}/></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Items</Label>
                <Button variant="outline" size="sm" onClick={()=>setItems(p=>[...p,{...EMPTY_ITEM}])}><Plus className="w-3 h-3 mr-1"/>Add Row</Button>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600 min-w-[160px]">Product</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-20">Qty</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-28">Unit Cost</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-24">Total</th>
                    <th className="w-10"></th>
                  </tr></thead>
                  <tbody>{items.map((it,idx)=>(
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-1 px-2"><Input list={`po-prod-${idx}`} className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2" value={it.name} onChange={e=>setItem(idx,'name',e.target.value)}/><datalist id={`po-prod-${idx}`}>{products.map(p=><option key={p.id} value={p.name}/>)}</datalist></td>
                      <td className="py-1 px-2"><Input type="number" min="1" className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-16" value={it.qty} onChange={e=>setItem(idx,'qty',e.target.value)}/></td>
                      <td className="py-1 px-2"><Input type="number" min="0" step="0.01" className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-24" value={it.unit_cost} onChange={e=>setItem(idx,'unit_cost',e.target.value)}/></td>
                      <td className="py-1 px-2 font-semibold">{fmt(it.total)}</td>
                      <td className="py-1 px-1"><button onClick={()=>setItems(p=>p.filter((_,j)=>j!==idx))} disabled={items.length===1} className="p-1 hover:bg-red-50 rounded text-red-400 disabled:opacity-30"><X className="w-3 h-3"/></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end text-sm space-y-1 flex-col items-end">
              <div className="flex justify-between gap-8 w-48"><span className="text-slate-500">Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between gap-8 w-48 items-center"><span className="text-slate-500">Discount</span><Input type="number" min="0" className="h-7 text-sm bg-slate-50 border-slate-200 rounded-lg px-2 w-24 text-right" value={form.discount} onChange={e=>setForm(f=>({...f,discount:e.target.value}))}/></div>
              <div className="flex justify-between gap-8 w-48"><span className="text-slate-500">Tax ({taxRate}%)</span><span>{fmt(taxAmt)}</span></div>
              <div className="flex justify-between gap-8 w-48 font-bold text-base border-t pt-2"><span>Total</span><span className="text-blue-700">{fmt(grandTotal)}</span></div>
            </div>
            <div><Label>Notes</Label><Textarea className="bg-slate-50 border-slate-200 rounded-xl" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} disabled={saving}>{saving?'Saving…':'Create PO'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View PO */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={()=>setViewing(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{viewing.order_number || 'PO Details'}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-4 text-slate-600">
                <span><b>Supplier:</b> {viewing.supplier_name||'—'}</span>
                <span><b>Expected:</b> {viewing.expected_date||'—'}</span>
                <span><b>Status:</b> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[viewing.po_status??'draft']}`}>{viewing.po_status||'draft'}</span></span>
              </div>
              <table className="w-full border border-slate-200 rounded-xl overflow-hidden whitespace-nowrap">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Product</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Unit Cost</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600">Total</th>
                </tr></thead>
                <tbody>{viewing.items.map((it,i)=>(
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-2 px-3">{it.name}</td>
                    <td className="py-2 px-3 text-right">{it.qty}</td>
                    <td className="py-2 px-3 text-right">{fmt(it.unit_cost)}</td>
                    <td className="py-2 px-3 text-right font-medium">{fmt(it.total)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="text-right font-bold text-base border-t pt-2 flex justify-end gap-8"><span>Total</span><span className="text-blue-700">{fmt(viewing.total)}</span></div>
              <div className="flex justify-end gap-2">
                {canEdit && viewing.po_status === 'draft' && <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={()=>{updateStatus(viewing.id,'sent');setViewing(null);}}><Send className="w-4 h-4 mr-1"/>Send to Supplier</Button>}
                {canEdit && (viewing.po_status==='sent'||viewing.po_status==='confirmed') && <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={()=>{updateStatus(viewing.id,'received');setViewing(null);}}><Truck className="w-4 h-4 mr-1"/>Mark Received</Button>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
