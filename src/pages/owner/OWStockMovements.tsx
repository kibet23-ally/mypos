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
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Search, ArrowLeftRight, ArrowUp, ArrowDown, Plus,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Package
} from 'lucide-react';

interface StockMovement {
  id: string; product_id: string; movement_type: string; quantity: number;
  balance_after: number; unit_cost?: number; notes?: string; reference_type?: string;
  reference_id?: string; created_at: string;
  products?: { name: string; sku?: string; };
}
interface Product { id: string; name: string; sku?: string; stock: number; }

const PAGE = 20;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  sale:        { label: 'Sale',       color: 'text-red-600',    icon: TrendingDown },
  purchase:    { label: 'Purchase',   color: 'text-green-600',  icon: TrendingUp   },
  return:      { label: 'Return',     color: 'text-blue-600',   icon: ArrowUp      },
  adjustment:  { label: 'Adjustment', color: 'text-orange-500', icon: ArrowLeftRight },
  opening:     { label: 'Opening',    color: 'text-purple-600', icon: Package      },
  damage:      { label: 'Damage',     color: 'text-red-700',    icon: TrendingDown },
  transfer:    { label: 'Transfer',   color: 'text-slate-500',  icon: ArrowLeftRight },
};

export default function OWStockMovements() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const canManage = appUser?.role === 'owner' || (appUser?.role as string) === 'manager';
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ product_id: '', movement_type: 'adjustment', quantity: '', notes: '', unit_cost: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('stock_movements')
      .select('*, products(name,sku)', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id)
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (filterType) q = q.eq('movement_type', filterType);
    if (search) {
      // filter by product name via join — need separate product lookup
      const { data: pids } = await supabase.from('products').select('id')
        .eq('tenant_id', appUser.tenant_id).ilike('name', `%${search}%`);
      if (pids && pids.length > 0) q = q.in('product_id', pids.map(p => p.id));
      else { setMovements([]); setTotal(0); setLoading(false); return; }
    }
    const { data, count, error } = await q;
    if (!error) { setMovements((data ?? []) as StockMovement[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [appUser?.tenant_id, page, search, filterType]);

  const loadProducts = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    const { data } = await supabase.from('products').select('id,name,sku,stock')
      .eq('tenant_id', appUser.tenant_id).order('name').limit(500);
    setProducts((data ?? []) as Product[]);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const save = async () => {
    if (!appUser?.tenant_id) return;
    if (!form.product_id) { toast.error('Select a product'); return; }
    const qty = parseInt(form.quantity);
    if (!qty || qty === 0) { toast.error('Quantity cannot be zero'); return; }
    setSaving(true);

    // Get current stock
    const { data: prod } = await supabase.from('products').select('stock').eq('id', form.product_id).single();
    const curStock = prod?.stock ?? 0;
    const actualQty = ['sale','damage'].includes(form.movement_type) ? -Math.abs(qty) : Math.abs(qty);
    const newBalance = curStock + actualQty;
    if (newBalance < 0 && form.movement_type !== 'adjustment') { toast.error('Insufficient stock'); setSaving(false); return; }

    // Update product stock
    const { error: stockErr } = await supabase.from('products').update({ stock: newBalance, updated_at: new Date().toISOString() }).eq('id', form.product_id);
    if (stockErr) { toast.error(stockErr.message); setSaving(false); return; }

    // Log movement
    const { error: mvErr } = await supabase.from('stock_movements').insert({
      tenant_id: appUser.tenant_id, product_id: form.product_id,
      movement_type: form.movement_type, quantity: actualQty, balance_after: newBalance,
      unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
      notes: form.notes || null, reference_type: 'adjustment', created_by: appUser.id,
    });
    setSaving(false);
    if (mvErr) { toast.error(mvErr.message); return; }
    toast.success('Stock movement recorded');
    setOpen(false); load(); loadProducts();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Stock Movements</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        {canManage && <Button onClick={() => { setForm({product_id:'',movement_type:'adjustment',quantity:'',notes:'',unit_cost:''}); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-1"><Plus className="w-4 h-4" />Add Adjustment</Button>}
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className={`${inp} pl-9`} placeholder="Search product…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <select className={`${inp} w-full md:w-44`} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0); }}>
              <option value="">All Types</option>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No movements recorded yet.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">
                {['Product','SKU','Type','Qty','Balance After','Unit Cost','Notes','Date'].map(h =>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>
                )}
              </tr></thead>
              <tbody>{movements.map(m => {
                const cfg = TYPE_CONFIG[m.movement_type] ?? { label: m.movement_type, color: 'text-slate-600', icon: ArrowLeftRight };
                const Icon = cfg.icon;
                return (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-800">{m.products?.name || '—'}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-xs">{m.products?.sku || '—'}</td>
                    <td className="py-2 px-3">
                      <span className={`flex items-center gap-1 font-medium ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />{cfg.label}
                      </span>
                    </td>
                    <td className={`py-2 px-3 font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-700">{m.balance_after}</td>
                    <td className="py-2 px-3 text-slate-500">{m.unit_cost != null ? fmt(m.unit_cost) : '—'}</td>
                    <td className="py-2 px-3 text-slate-400 max-w-[140px] truncate">{m.notes || '—'}</td>
                    <td className="py-2 px-3 text-slate-400">{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}</tbody>
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

      {/* Add Adjustment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Product</Label>
              <select className={`w-full ${inp}`} value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
                <option value="">— Select product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Movement Type</Label>
                <select className={`w-full ${inp}`} value={form.movement_type} onChange={e => setForm(f => ({ ...f, movement_type: e.target.value }))}>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" className={inp} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 10 or -5" />
              </div>
            </div>
            <div>
              <Label>Unit Cost (optional)</Label>
              <Input type="number" step="0.01" className={inp} value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input className={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for adjustment…" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Movement'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
