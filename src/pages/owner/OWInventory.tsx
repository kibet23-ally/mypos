import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import {
  Boxes, Search, AlertTriangle, TrendingDown, TrendingUp,
  RefreshCw, PackagePlus, Loader2, DollarSign, Package,
  Upload, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useForm } from 'react-hook-form';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import InventoryImportDialog from '@/components/inventory/InventoryImportDialog';

interface InventoryRow {
  id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  category_name: string;
  quantity_on_hand: number;
  reorder_level: number;
  cost_price: number;
  price: number;
  unit: string;
  status: 'in-stock' | 'low' | 'out';
  stock_value: number;
}

interface Movement {
  id: string;
  product_name: string;
  change_qty: number;
  reason: string;
  notes: string | null;
  created_at: string;
}

interface AdjustForm { mode: 'add' | 'remove' | 'set'; quantity: string; reason: string; notes: string; }

const STATUS_CFG = {
  'in-stock': { label: 'In Stock',     cls: 'badge-success' },
  low:        { label: 'Low Stock',    cls: 'badge-warning' },
  out:        { label: 'Out of Stock', cls: 'badge-danger' },
};

function deriveStatus(qty: number, reorder: number): 'in-stock' | 'low' | 'out' {
  if (qty <= 0) return 'out';
  if (qty <= reorder) return 'low';
  return 'in-stock';
}

export default function OWInventory() {
  const { appUser } = useAuth();
  const cc       = appUser?.currency_code ?? 'KES';
  const tenantId = appUser?.tenant_id ?? '';

  const [rows,      setRows]      = useState<InventoryRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [adjustRow, setAdjustRow] = useState<InventoryRow | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const form = useForm<AdjustForm>({
    defaultValues: { mode: 'add', quantity: '', reason: 'adjustment', notes: '' },
  });

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          id, product_id, quantity_on_hand, reorder_level,
          products(name, sku, price, cost_price, unit, categories(name))
        `)
        .eq('tenant_id', tenantId)
        .order('quantity_on_hand', { ascending: true });

      if (error) throw error;

      setRows(((data ?? []) as unknown as Array<{
        id: string; product_id: string; quantity_on_hand: number; reorder_level: number;
        products?: { name?: string; sku?: string | null; price?: number; cost_price?: number; unit?: string; categories?: { name?: string } | null };
      }>).map((r) => {
        const p = r.products ?? {};
        return {
          id: r.id,
          product_id: r.product_id,
          product_name: p.name ?? '—',
          sku: p.sku ?? null,
          category_name: (p.categories as { name?: string } | null)?.name ?? '—',
          quantity_on_hand: r.quantity_on_hand,
          reorder_level: r.reorder_level,
          cost_price: p.cost_price ?? 0,
          price: p.price ?? 0,
          unit: p.unit ?? 'pcs',
          status: deriveStatus(r.quantity_on_hand, r.reorder_level),
          stock_value: r.quantity_on_hand * (p.cost_price ?? 0),
        };
      }));

      // Load movements
      const { data: mvs } = await supabase
        .from('stock_movements')
        .select('id, product_id, change_qty, reason, notes, created_at, products(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      setMovements(((mvs ?? []) as unknown as Array<{
        id: string; product_id: string; change_qty: number; reason: string; notes: string | null; created_at: string;
        products?: { name?: string };
      }>).map((m) => ({
        id: m.id,
        product_name: m.products?.name ?? '—',
        change_qty: m.change_qty,
        reason: m.reason,
        notes: m.notes,
        created_at: m.created_at,
      })));
    } catch (err) {
      toast.error('Failed to load inventory');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleAdjust = async (values: AdjustForm) => {
    if (!adjustRow) return;
    const qty = parseInt(values.quantity, 10);
    if (isNaN(qty) || qty <= 0) { toast.error('Enter a valid quantity'); return; }

    setSaving(true);
    try {
      let newQty = adjustRow.quantity_on_hand;
      if (values.mode === 'add')    newQty += qty;
      else if (values.mode === 'remove') newQty = Math.max(0, newQty - qty);
      else newQty = qty;

      const changeQty = newQty - adjustRow.quantity_on_hand;

      const { error: invErr } = await supabase
        .from('inventory')
        .update({ quantity_on_hand: newQty, updated_at: new Date().toISOString() })
        .eq('id', adjustRow.id);
      if (invErr) throw invErr;

      await supabase.from('stock_movements').insert({
        tenant_id: tenantId,
        product_id: adjustRow.product_id,
        change_qty: changeQty,
        reason: values.reason,
        notes: values.notes || null,
        created_at: new Date().toISOString(),
      });

      toast.success(`Stock updated for ${adjustRow.product_name}`);
      setAdjustRow(null);
      form.reset({ mode: 'add', quantity: '', reason: 'adjustment', notes: '' });
      await load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = rows.filter(r =>
    !search || r.product_name.toLowerCase().includes(search.toLowerCase()) || (r.sku ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalValue   = rows.reduce((s, r) => s + r.stock_value, 0);
  const lowCount     = rows.filter(r => r.status === 'low').length;
  const outCount     = rows.filter(r => r.status === 'out').length;
  const inStockCount = rows.filter(r => r.status === 'in-stock').length;

  const topStockChart = [...rows]
    .sort((a, b) => b.quantity_on_hand - a.quantity_on_hand)
    .slice(0, 8)
    .map(r => ({ name: r.product_name.substring(0, 14), qty: r.quantity_on_hand }));

  const exportInventory = () => {
    if (rows.length === 0) { toast.error('Nothing to export yet'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Product', 'SKU', 'Category', 'Quantity On Hand', 'Reorder Level', 'Unit', 'Cost Price', 'Selling Price', 'Stock Value', 'Status'],
      ...rows.map(r => [
        r.product_name, r.sku ?? '', r.category_name, r.quantity_on_hand, r.reorder_level,
        r.unit, r.cost_price, r.price, r.stock_value, STATUS_CFG[r.status].label,
      ]),
    ]);
    ws['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `posifypro_inventory_export_${dateStr}.xlsx`);
    toast.success(`Exported ${rows.length} products`);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Inventory Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Stock levels, movements, and valuation</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportInventory} className="gap-2 shrink-0">
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2 shrink-0">
            <Upload className="w-3.5 h-3.5" />
            Import
          </Button>
        </div>
      </div>

      <InventoryImportDialog open={importOpen} onOpenChange={setImportOpen} onComplete={load} />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 bg-muted rounded-lg" />) : [
          { label: 'Total Stock Value', value: formatCurrency(totalValue, cc), icon: DollarSign, color: 'text-primary' },
          { label: 'In Stock',          value: inStockCount.toString(),              icon: Package,    color: 'text-green-600' },
          { label: 'Low Stock',         value: lowCount.toString(),                  icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Out of Stock',      value: outCount.toString(),                  icon: TrendingDown,  color: 'text-red-500' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <k.icon className={`w-4 h-4 ${k.color}`} />
            <div>
              <p className="text-xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs font-medium text-foreground text-balance">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="stock">
        <TabsList className="h-9">
          <TabsTrigger value="stock"     className="text-xs px-3">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements" className="text-xs px-3">Movements</TabsTrigger>
          <TabsTrigger value="analysis"  className="text-xs px-3">Analysis</TabsTrigger>
        </TabsList>

        {/* Stock Levels tab */}
        <TabsContent value="stock" className="mt-4">
          <Card className="border border-border shadow-card">
            <CardHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-0 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm px-3" />
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{filtered.length} items</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 bg-muted" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No inventory records found
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-max text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Product', 'SKU', 'Category', 'Qty', 'Reorder', 'Cost Price', 'Stock Value', 'Status', ''].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(r => (
                        <tr key={r.id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap max-w-[160px] truncate">{r.product_name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.sku ?? '—'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.category_name}</td>
                          <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{r.quantity_on_hand} {r.unit}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.reorder_level}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{formatCurrency(r.cost_price, cc)}</td>
                          <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{formatCurrency(r.stock_value, cc)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CFG[r.status].cls}`}>
                              {STATUS_CFG[r.status].label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => { setAdjustRow(r); form.reset({ mode: 'add', quantity: '', reason: 'adjustment', notes: '' }); }}>
                              <PackagePlus className="w-3 h-3" /> Adjust
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements tab */}
        <TabsContent value="movements" className="mt-4">
          <Card className="border border-border shadow-card">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-sm font-semibold text-balance">Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 bg-muted" />)}</div>
              ) : movements.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No movements recorded yet</div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-max text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Product', 'Change', 'Reason', 'Notes', 'Date'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map(m => (
                        <tr key={m.id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{m.product_name}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`font-semibold ${m.change_qty >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                              {m.change_qty >= 0 ? '+' : ''}{m.change_qty}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap capitalize">{m.reason}</td>
                          <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">{m.notes ?? '—'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {new Date(m.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis tab */}
        <TabsContent value="analysis" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-border shadow-card h-full">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold text-balance flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[hsl(var(--chart-1))]" /> Top Stock Levels
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {loading ? <Skeleton className="h-52 bg-muted" /> : (
                  <div className="w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={topStockChart} layout="vertical" barSize={14}>
                        <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={96} />
                        <Tooltip />
                        <Bar dataKey="qty" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Qty" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border shadow-card h-full">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold text-balance">Low Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {loading ? <Skeleton className="h-52 bg-muted" /> : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {rows.filter(r => r.status !== 'in-stock').length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">All products are well-stocked</div>
                    ) : rows.filter(r => r.status !== 'in-stock').map(r => (
                      <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.product_name}</p>
                          <p className="text-xs text-muted-foreground">{r.quantity_on_hand} / {r.reorder_level} reorder level</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${STATUS_CFG[r.status].cls}`}>
                          {STATUS_CFG[r.status].label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Adjustment dialog */}
      <Dialog open={!!adjustRow} onOpenChange={open => { if (!open) setAdjustRow(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-balance">Adjust Stock — {adjustRow?.product_name}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAdjust)} className="space-y-4">
              <div className="p-3 rounded-lg bg-secondary text-sm">
                Current stock: <span className="font-bold">{adjustRow?.quantity_on_hand} {adjustRow?.unit}</span>
              </div>
              <FormField control={form.control} name="mode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Adjustment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="add">Add Stock</SelectItem>
                      <SelectItem value="remove">Remove Stock</SelectItem>
                      <SelectItem value="set">Set Exact Quantity</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="quantity" rules={{ required: 'Required' }} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Quantity</FormLabel>
                  <FormControl><Input type="number" min="1" placeholder="Enter quantity" {...field} className="h-9 px-3" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                      <SelectItem value="purchase">New Purchase</SelectItem>
                      <SelectItem value="damage">Damage / Loss</SelectItem>
                      <SelectItem value="return">Customer Return</SelectItem>
                      <SelectItem value="transfer">Stock Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Notes (optional)</FormLabel>
                  <FormControl><Input placeholder="Additional notes…" {...field} className="h-9 px-3" /></FormControl>
                </FormItem>
              )} />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setAdjustRow(null)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Adjustment'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}