<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import {
  Package, Search, Plus, AlertTriangle, Pencil, Trash2, Loader2,
  PackagePlus, TrendingUp, TrendingDown, RefreshCw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import type { Product, Category } from '@/types/index';

// ─── types ────────────────────────────────────────────────────────────────────
type StockStatus = 'in-stock' | 'low' | 'out';
type AdjustmentMode = 'add' | 'remove' | 'set';

interface ProductRow extends Product {
  stockStatus: StockStatus;
  quantity_on_hand: number;
  reorder_level: number;
  inventory_id: string | null;
  is_available: boolean;
}

interface ProductFormValues {
  name: string;
  sku: string;
  category_id: string;
  price: string;
  cost_price: string;
  tax_rate: string;
  unit: string;
  description: string;
  is_available: boolean;
}

interface StockFormValues {
  mode: AdjustmentMode;
  quantity: string;
  reorder_level: string;
  notes: string;
}

const STATUS_CFG: Record<StockStatus, { label: string; cls: string }> = {
  'in-stock': { label: 'In Stock',     cls: 'bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)]' },
  low:        { label: 'Low Stock',    cls: 'bg-[hsl(38_92%_90%)] text-[hsl(38_92%_30%)]' },
  out:        { label: 'Out of Stock', cls: 'bg-[hsl(0_72%_94%)] text-[hsl(0_72%_35%)]' },
};

function deriveStatus(qty: number, reorder: number): StockStatus {
  if (qty <= 0) return 'out';
  if (qty <= reorder) return 'low';
  return 'in-stock';
}

// ─── component ────────────────────────────────────────────────────────────────
export default function OWProducts() {
  const { appUser } = useAuth();
  const cc = appUser?.currency_code ?? 'KES';

  const [products,     setProducts]     = useState<ProductRow[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [branchId,     setBranchId]     = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editProduct,  setEditProduct]  = useState<ProductRow | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState<string | null>(null);

  // Stock dialog state
  const [stockDialogOpen,   setStockDialogOpen]   = useState(false);
  const [stockProduct,      setStockProduct]      = useState<ProductRow | null>(null);
  const [savingStock,       setSavingStock]        = useState(false);

  const productForm = useForm<ProductFormValues>({
    defaultValues: { name: '', sku: '', category_id: 'none', price: '', cost_price: '0', tax_rate: '0', unit: 'pcs', description: '', is_available: true },
  });

  const stockForm = useForm<StockFormValues>({
    defaultValues: { mode: 'add', quantity: '', reorder_level: '5', notes: '' },
  });

  const watchMode = stockForm.watch('mode') as AdjustmentMode;

  // ─── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    try {
      // Resolve branch to use (owner's branch or first branch of tenant)
      let resolvedBranch = appUser.branch_id ?? null;
      if (!resolvedBranch) {
        const { data: branches } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', appUser.tenant_id)
          .eq('is_active', true)
          .order('created_at')
          .limit(1);
        resolvedBranch = branches?.[0]?.id ?? null;
      }
      setBranchId(resolvedBranch);

      const [{ data: prods, error: pe }, { data: cats, error: ce }] = await Promise.all([
        supabase
          .from('products')
          .select(`*, inventory(id, quantity_on_hand, reorder_level)`)
          .eq('tenant_id', appUser.tenant_id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('categories')
          .select('*')
          .eq('tenant_id', appUser.tenant_id)
          .eq('is_active', true)
          .order('sort_order'),
      ]);
      if (pe) throw pe;
      if (ce) throw ce;

      type RawProduct = Product & { inventory?: { id: string; quantity_on_hand: number; reorder_level: number }[]; is_available?: boolean };
      const rows: ProductRow[] = (prods ?? []).map((p: RawProduct) => {
        const inv = p.inventory?.[0];
        const qty = inv?.quantity_on_hand ?? 0;
        const reorder = inv?.reorder_level ?? 5;
        return {
          ...p,
          quantity_on_hand: qty,
          reorder_level: reorder,
          inventory_id: inv?.id ?? null,
          stockStatus: deriveStatus(qty, reorder),
          is_available: (p as RawProduct).is_available ?? true,
        };
      });
      setProducts(rows);
      setCategories(cats ?? []);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [appUser?.tenant_id, appUser?.branch_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── product dialog ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditProduct(null);
    productForm.reset({ name: '', sku: '', category_id: 'none', price: '', cost_price: '0', tax_rate: '0', unit: 'pcs', description: '', is_available: true });
    setDialogOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditProduct(p);
    productForm.reset({
      name: p.name, sku: p.sku ?? '',
      category_id: p.category_id ?? 'none',
      price: String(p.price), cost_price: String(p.cost_price),
      tax_rate: String(p.tax_rate), unit: p.unit, description: p.description ?? '',
      is_available: p.is_available ?? true,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: ProductFormValues) => {
    if (!appUser?.tenant_id) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id:    appUser.tenant_id,
        name:         values.name.trim(),
        sku:          values.sku.trim() || null,
        category_id:  values.category_id === 'none' ? null : values.category_id,
        price:        parseFloat(values.price),
        cost_price:   parseFloat(values.cost_price),
        tax_rate:     parseFloat(values.tax_rate),
        unit:         values.unit.trim() || 'pcs',
        description:  values.description.trim() || null,
        is_available: values.is_available,
      };
      if (editProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
        if (error) throw error;
        toast.success('Product updated');
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
        toast.success('Product added');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // ─── soft-delete ────────────────────────────────────────────────────────────
  const deleteProduct = async (id: string) => {
    if (!confirm('Archive this product?')) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast.success('Product archived');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to archive product');
    } finally {
      setDeleting(null);
    }
  };

  // ─── stock dialog ────────────────────────────────────────────────────────────
  const openStock = (p: ProductRow) => {
    setStockProduct(p);
    stockForm.reset({
      mode: 'add',
      quantity: '',
      reorder_level: String(p.reorder_level),
      notes: '',
    });
    setStockDialogOpen(true);
  };

  const onStockSubmit = async (values: StockFormValues) => {
    if (!stockProduct || !appUser?.tenant_id) return;
    if (!branchId) { toast.error('No branch found. Please set up a branch first.'); return; }

    const qty = parseFloat(values.quantity);
    if (isNaN(qty) || qty < 0) { toast.error('Enter a valid quantity'); return; }

    const reorderLevel = parseFloat(values.reorder_level) || 5;
    const currentQty   = stockProduct.quantity_on_hand;

    let newQty: number;
    let movementType: 'adjustment' | 'purchase';

    if (values.mode === 'set') {
      newQty = qty;
      movementType = 'adjustment';
    } else if (values.mode === 'add') {
      newQty = currentQty + qty;
      movementType = 'purchase';
    } else {
      newQty = Math.max(0, currentQty - qty);
      movementType = 'adjustment';
    }

    setSavingStock(true);
    try {
      // Upsert inventory row
      const { error: invErr } = await supabase
        .from('inventory')
        .upsert(
          {
            tenant_id:        appUser.tenant_id,
            branch_id:        branchId,
            product_id:       stockProduct.id,
            quantity_on_hand: newQty,
            reorder_level:    reorderLevel,
            updated_at:       new Date().toISOString(),
          },
          { onConflict: 'branch_id,product_id' },
        );
      if (invErr) throw invErr;

      // Log the stock movement
      const delta = values.mode === 'set'
        ? newQty - currentQty
        : values.mode === 'add'
          ? qty
          : -(currentQty - newQty);

      const { error: mvErr } = await supabase.from('stock_movements').insert({
        tenant_id:    appUser.tenant_id,
        branch_id:    branchId,
        product_id:   stockProduct.id,
        performed_by: appUser.id,
        movement_type: movementType,
        quantity:     delta,
        balance_after: newQty,
        notes: values.notes.trim() || null,
      });
      if (mvErr) throw mvErr;

      const verb = values.mode === 'set' ? 'set to' : values.mode === 'add' ? 'increased by' : 'reduced by';
      toast.success(`Stock ${verb} ${qty} — new balance: ${newQty} ${stockProduct.unit}`);
      setStockDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update stock');
    } finally {
      setSavingStock(false);
    }
  };

  // ─── derived ─────────────────────────────────────────────────────────────────
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  const stockChart = categories.map(c => ({
    cat: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name,
    stock: products.filter(p => p.category_id === c.id).reduce((s, p) => s + p.quantity_on_hand, 0),
  })).filter(c => c.stock > 0);

  // ─── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground text-balance">Products</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your product catalog and stock levels</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="relative w-full md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 px-3 h-9" />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" className="h-9 gap-1.5 shrink-0 font-medium" onClick={openAdd}>
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Product</span>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Products', value: products.length,                                          icon: Package,       cls: 'text-foreground' },
          { label: 'Low Stock',      value: products.filter(p => p.stockStatus === 'low').length,  icon: AlertTriangle, cls: 'text-[hsl(var(--warning))]' },
          { label: 'Out of Stock',   value: products.filter(p => p.stockStatus === 'out').length,  icon: AlertTriangle, cls: 'text-destructive' },
        ].map(s => (
          <Card key={s.label} className="border border-border h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                <s.icon className={`w-5 h-5 ${s.cls}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {stockChart.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Stock by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stockChart} barSize={40}>
                  <XAxis dataKey="cat" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Units']} />
                  <Bar dataKey="stock" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} name="Stock" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products table */}
      <Card className="border border-border min-w-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">
            Product List <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading products…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['SKU', 'Product', 'Category', 'Stock', 'Reorder At', 'Price', 'On POS', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      {search ? 'No products match your search.' : 'No products yet — click Add Product to get started.'}
                    </td></tr>
                  ) : filtered.map((p, i) => {
                    const cfg = STATUS_CFG[p.stockStatus];
                    return (
                      <tr key={p.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                        <td className="px-6 py-3 text-xs text-muted-foreground font-mono">{p.sku ?? '—'}</td>
                        <td className="px-6 py-3 text-sm font-medium text-foreground">{p.name}</td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">{catMap[p.category_id ?? ''] ?? '—'}</td>
                        <td className={`px-6 py-3 text-sm font-semibold ${p.stockStatus === 'out' ? 'text-destructive' : p.stockStatus === 'low' ? 'text-[hsl(var(--warning))]' : 'text-foreground'}`}>
                          {p.quantity_on_hand} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">{p.reorder_level}</td>
                        <td className="px-6 py-3 text-sm text-foreground">{formatCurrency(Number(p.price), cc)}</td>
                        <td className="px-6 py-3">
                          <button
                            type="button"
                            title={p.is_available ? 'Visible on POS — click to hide' : 'Hidden from POS — click to show'}
                            onClick={async () => {
                              const { error } = await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id);
                              if (error) { toast.error(error.message); return; }
                              setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_available: !p.is_available } : x));
                              toast.success(p.is_available ? 'Hidden from POS' : 'Now visible on POS');
                            }}
                            className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${
                              p.is_available
                                ? 'border-[hsl(152_76%_45%)] bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)] hover:bg-[hsl(152_76%_88%)]'
                                : 'border-border bg-muted text-muted-foreground hover:bg-muted/60'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.is_available ? 'bg-[hsl(152_76%_40%)]' : 'bg-muted-foreground'}`} />
                            {p.is_available ? 'Visible' : 'Hidden'}
                          </button>
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant="secondary" className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--success))]"
                              title="Update stock"
                              onClick={() => openStock(p)}
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Edit product"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Archive product"
                              disabled={deleting === p.id}
                              onClick={() => deleteProduct(p.id)}
                            >
                              {deleting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Product Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={productForm.control} name="name" rules={{ required: 'Product name is required' }} render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm font-normal">Product Name *</FormLabel>
                    <FormControl><Input placeholder="e.g. Espresso Beans (1kg)" className="px-3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal">SKU</FormLabel>
                    <FormControl><Input placeholder="e.g. BEV-001" className="px-3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="category_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="px-3"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="price" rules={{ required: 'Price is required' }} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal">Selling Price *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" placeholder="0.00" className="px-3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="cost_price" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal">Cost Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" placeholder="0.00" className="px-3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="tax_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal">Tax Rate (%)</FormLabel>
                    <FormControl><Input type="number" step="0.1" min="0" max="100" placeholder="16" className="px-3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal">Unit</FormLabel>
                    <FormControl><Input placeholder="pcs / kg / ltr" className="px-3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="description" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm font-normal">Description</FormLabel>
                    <FormControl><Input placeholder="Optional description" className="px-3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={productForm.control} name="is_available" render={({ field }) => (
                  <FormItem className="md:col-span-2 flex items-center justify-between rounded border border-border px-4 py-3 bg-muted/20">
                    <div>
                      <FormLabel className="text-sm font-medium cursor-pointer">Show on Point of Sale</FormLabel>
                      <p className="text-xs text-muted-foreground mt-0.5">When off, this product is hidden from the POS screen</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="min-w-[90px]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editProduct ? 'Save Changes' : 'Add Product'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Update Stock Dialog ── */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance">
              <PackagePlus className="w-5 h-5 shrink-0" /> Update Stock
            </DialogTitle>
          </DialogHeader>

          {stockProduct && (
            <>
              {/* Current stock summary */}
              <div className="flex items-center gap-4 p-4 rounded border border-border bg-muted/20">
                <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{stockProduct.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    SKU: {stockProduct.sku ?? '—'} · Unit: {stockProduct.unit}
                  </p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className={`text-xl font-bold ${stockProduct.stockStatus === 'out' ? 'text-destructive' : stockProduct.stockStatus === 'low' ? 'text-[hsl(var(--warning))]' : 'text-foreground'}`}>
                    {stockProduct.quantity_on_hand}
                  </p>
                  <p className="text-xs text-muted-foreground">current</p>
                </div>
              </div>

              <Separator />

              <Form {...stockForm}>
                <form onSubmit={stockForm.handleSubmit(onStockSubmit)} className="space-y-4">
                  {/* Adjustment type */}
                  <FormField control={stockForm.control} name="mode" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Adjustment Type</FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: 'add',    label: 'Add Stock',    Icon: TrendingUp,   cls: 'hover:border-[hsl(var(--success))]' },
                          { value: 'remove', label: 'Remove Stock', Icon: TrendingDown, cls: 'hover:border-destructive' },
                          { value: 'set',    label: 'Set Exact',    Icon: RefreshCw,    cls: 'hover:border-primary' },
                        ] as const).map(({ value, label, Icon, cls }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded border-2 transition-colors text-center
                              ${field.value === value
                                ? value === 'add'
                                  ? 'border-[hsl(var(--success))] bg-[hsl(var(--success))]/5'
                                  : value === 'remove'
                                    ? 'border-destructive bg-destructive/5'
                                    : 'border-primary bg-primary/5'
                                : `border-border bg-card ${cls}`
                              }`}
                          >
                            <Icon className={`w-4 h-4 ${
                              field.value === value
                                ? value === 'add' ? 'text-[hsl(var(--success))]' : value === 'remove' ? 'text-destructive' : 'text-primary'
                                : 'text-muted-foreground'
                            }`} />
                            <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )} />

                  {/* Quantity + preview */}
                  <FormField
                    control={stockForm.control}
                    name="quantity"
                    rules={{
                      required: 'Quantity is required',
                      min: { value: 0, message: 'Must be ≥ 0' },
                      validate: v => !isNaN(parseFloat(v)) || 'Enter a valid number',
                    }}
                    render={({ field }) => {
                      const qty = parseFloat(field.value) || 0;
                      const newQty = watchMode === 'set'
                        ? qty
                        : watchMode === 'add'
                          ? stockProduct.quantity_on_hand + qty
                          : Math.max(0, stockProduct.quantity_on_hand - qty);
                      const diff = newQty - stockProduct.quantity_on_hand;

                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-normal">
                            {watchMode === 'set' ? 'New Quantity' : watchMode === 'add' ? 'Quantity to Add' : 'Quantity to Remove'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number" min="0" step="1" placeholder="0"
                              className="px-3 h-10 text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          {/* Live preview */}
                          {field.value !== '' && (
                            <div className="flex items-center justify-between text-xs px-3 py-2 rounded bg-muted/30 border border-border mt-1">
                              <span className="text-muted-foreground">New balance</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm">{newQty} {stockProduct.unit}</span>
                                {diff !== 0 && (
                                  <span className={`font-medium ${diff > 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                                    ({diff > 0 ? '+' : ''}{diff})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </FormItem>
                      );
                    }}
                  />

                  {/* Reorder level */}
                  <FormField control={stockForm.control} name="reorder_level" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Reorder Level (alert threshold)</FormLabel>
                      <FormControl><Input type="number" min="0" step="1" placeholder="5" className="px-3 h-9" {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground mt-1">Show "Low Stock" warning when quantity falls to or below this number</p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Notes */}
                  <FormField control={stockForm.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Notes (optional)</FormLabel>
                      <FormControl><Input placeholder="e.g. Delivery from supplier, Stock count…" className="px-3 h-9" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setStockDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={savingStock} className="min-w-[120px]">
                      {savingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4 mr-1.5" />}
                      {savingStock ? 'Saving…' : 'Update Stock'}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
=======
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Plus, Package, Edit2, Trash2, AlertTriangle, Tag, ChevronDown, Upload, Copy, Barcode } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import ProductImportDialog from '@/components/products/ProductImportDialog';

interface Product { id: string; name: string; sku: string; barcode?: string | null; price: number; buying_cost: number; stock: number; category: string; tenant_id: string; created_at: string; }
interface Category { id: string; name: string; }

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const inputClass = "h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3";

function fuzzyScore(text: string, q: string): number {
  if (!q) return 1;
  const t = text.toLowerCase(); const query = q.toLowerCase();
  if (t.includes(query)) return 1;
  let score = 0, qi = 0;
  for (let ti = 0; ti < t.length && qi < query.length; ti++) { if (t[ti] === query[qi]) { score++; qi++; } }
  return qi === query.length ? score / t.length : 0;
}

export default function OWProducts() {
  const { appUser } = useAuth();
  const { format: formatAmt } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRaw, setSearchRaw] = useState('');
  const debouncedSearch = useDebounce(searchRaw, 200);
  const [filterCategory, setFilterCategory] = useState('');
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', price: '', buying_cost: '', stock: '', category: '' });
  const [saving, setSaving] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', sku: '', barcode: '', price: '', buying_cost: '', stock: '', category: '' });
  const [editSaving, setEditSaving] = useState(false);
  // category management
  const [catSearch, setCatSearch] = useState('');
  const [catDropOpen, setCatDropOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  const loadCategories = async () => {
    if (!appUser?.tenant_id) return;
    const { data } = await supabase.from('categories').select('*').eq('tenant_id', appUser.tenant_id).order('name');
    setCategories(Array.isArray(data) ? data : []);
  };

  const load = async () => {
    if (!appUser?.tenant_id) return;
    const { data } = await supabase.from('products').select('*').eq('tenant_id', appUser.tenant_id).order('created_at', { ascending: false });
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); loadCategories(); }, [appUser?.tenant_id]);

  const filtered = products
    .filter(p => !filterCategory || p.category === filterCategory)
    .map(p => ({
      ...p,
      score: Math.max(fuzzyScore(p.name, debouncedSearch), fuzzyScore(p.sku, debouncedSearch), fuzzyScore(p.category, debouncedSearch)),
    }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);

  const filteredCats = categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !appUser?.tenant_id) return;
    setAddingCat(true);
    const { error } = await supabase.from('categories').insert({ tenant_id: appUser.tenant_id, name: newCatName.trim() });
    setAddingCat(false);
    if (error) { toast.error(error.message); } else {
      toast.success(`Category "${newCatName.trim()}" added`);
      setNewCatName('');
      await loadCategories();
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.price) { toast.error('Name, SKU and selling price are required'); return; }
    if (!form.category) { toast.error('Please select a product category'); return; }
    const costVal = parseFloat(form.buying_cost || '');
    if (!form.buying_cost || isNaN(costVal) || costVal <= 0) {
      toast.error('Buying cost (cost price) is required and must be greater than 0'); return;
    }
    if (costVal >= parseFloat(form.price)) {
      toast.warning('Buying cost is ≥ selling price — this product will not be profitable');
    }
    setSaving(true);
    const { error } = await supabase.from('products').insert({
      name: form.name, sku: form.sku, barcode: form.barcode || null,
      price: parseFloat(form.price),
      buying_cost: parseFloat(form.buying_cost || '0'),
      stock: parseInt(form.stock || '0'),
      category: form.category, tenant_id: appUser?.tenant_id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); } else {
      toast.success('Product added'); setOpen(false);
      setForm({ name: '', sku: '', barcode: '', price: '', buying_cost: '', stock: '', category: '' }); load();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast.error(error.message); } else { toast.success('Product deleted'); load(); }
  };

  // Quick "Duplicate Product" — prefills the Add dialog with an existing product's
  // details (minus SKU/barcode, which must stay unique) so the owner can tweak and save.
  const handleDuplicate = (p: Product) => {
    setForm({
      name: `${p.name} (Copy)`,
      sku: '',
      barcode: '',
      price: String(p.price),
      buying_cost: String(p.buying_cost ?? ''),
      stock: String(p.stock),
      category: p.category,
    });
    setOpen(true);
  };

  const handleEditOpen = (p: Product) => {
    setEditForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      price: String(p.price),
      buying_cost: String(p.buying_cost ?? ''),
      stock: String(p.stock),
      category: p.category,
    });
    setEditId(p.id);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    if (!editForm.name || !editForm.price) { toast.error('Name and selling price are required'); return; }
    const costVal = parseFloat(editForm.buying_cost || '');
    if (!editForm.buying_cost || isNaN(costVal) || costVal <= 0) {
      toast.error('Buying cost must be greater than 0'); return;
    }
    if (costVal >= parseFloat(editForm.price)) {
      toast.warning('Buying cost is ≥ selling price — this product will not be profitable');
    }
    setEditSaving(true);
    const { error } = await supabase.from('products').update({
      name: editForm.name,
      sku: editForm.sku,
      barcode: editForm.barcode || null,
      price: parseFloat(editForm.price),
      buying_cost: costVal,
      stock: parseInt(editForm.stock || '0'),
      category: editForm.category,
    }).eq('id', editId);
    setEditSaving(false);
    if (error) { toast.error(error.message); } else {
      toast.success('Product updated'); setEditId(null); load();
    }
  };

  // Barcode scanner support: a hardware/USB scanner types digits then sends Enter.
  // This field auto-submits on Enter without requiring the rest of the form to be filled,
  // matching against an existing product first (for fast lookup) before falling through
  // to "no match" so the owner knows it's a genuinely new item.
  const handleBarcodeScan = async (value: string) => {
    if (!value.trim()) return;
    const match = products.find(p => p.barcode === value.trim());
    if (match) {
      toast.success(`Found: ${match.name} (Stock: ${match.stock})`);
    } else {
      toast.info('No product found with this barcode — add it as a new product');
      setForm(prev => ({ ...prev, barcode: value.trim() }));
      setOpen(true);
    }
    if (barcodeInputRef.current) barcodeInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 text-balance">Products</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your product catalogue</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Barcode scanner input — focus this, scan, and it auto-submits on Enter */}
          <div className="relative w-44">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan barcode…"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeScan((e.target as HTMLInputElement).value); } }}
              className="h-10 w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl pl-9 pr-3 text-sm focus:outline-none"
            />
          </div>
          {/* Category filter */}
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="h-10 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 focus:outline-none focus:border-[#2563EB]">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {/* Search */}
          <div className="relative w-44">
            {!searchRaw && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
            <Input placeholder="Search products…" value={searchRaw} onChange={e => setSearchRaw(e.target.value)}
              className={`h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3 ${!searchRaw ? 'pl-9' : 'pl-3'}`} />
          </div>
          {/* Import Products */}
          <button onClick={() => setImportOpen(true)}
            className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 shrink-0">
            <Upload className="w-4 h-4" /> Import
          </button>
          {/* Add Product */}
          <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setForm({ name: '', sku: '', barcode: '', price: '', buying_cost: '', stock: '', category: '' }); setCatSearch(''); setCatDropOpen(false); } }}>
            <DialogTrigger asChild>
              <button className="h-10 px-4 rounded-xl text-sm font-semibold text-white flex items-center gap-2 shrink-0"
                style={{ background: '#2563EB' }}>
                <Plus className="w-4 h-4" /> Add
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md border-slate-200" style={{ background: '#ffffff' }}>
              <DialogHeader>
                <DialogTitle className="text-slate-900">Add Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                {[
                  { label: 'Name', key: 'name', placeholder: 'Espresso', type: 'text' },
                  { label: 'SKU', key: 'sku', placeholder: 'ESP-001', type: 'text' },
                  { label: 'Barcode (optional)', key: 'barcode', placeholder: 'Scan or type…', type: 'text' },
                  { label: 'Selling Price', key: 'price', placeholder: '350', type: 'number' },
                  { label: 'Buying Cost (Cost Price)', key: 'buying_cost', placeholder: '200', type: 'number' },
                  { label: 'Stock Qty', key: 'stock', placeholder: '100', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{f.label}</Label>
                    <Input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className={inputClass} />
                  </div>
                ))}

                {/* Category dropdown with search + create */}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <button type="button" onClick={() => setCatDropOpen(v => !v)}
                      className={`w-full h-10 flex items-center justify-between px-3 rounded-xl border text-sm transition-colors ${form.category ? 'text-slate-900' : 'text-slate-400'} ${catDropOpen ? 'border-[#2563EB]' : 'border-slate-200'} bg-slate-50`}>
                      <span className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {form.category || 'Select category…'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${catDropOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {catDropOpen && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-slate-100">
                          <Input placeholder="Search categories…" value={catSearch} onChange={e => setCatSearch(e.target.value)}
                            className="h-8 text-xs bg-slate-50 border-slate-200 rounded-lg px-2" autoFocus />
                        </div>
                        <div className="max-h-44 overflow-y-auto">
                          {filteredCats.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-3">No categories found</p>
                          )}
                          {filteredCats.map(c => (
                            <button key={c.id} type="button"
                              onClick={() => { setForm(p => ({ ...p, category: c.name })); setCatDropOpen(false); setCatSearch(''); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${form.category === c.name ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'}`}>
                              {c.name}
                            </button>
                          ))}
                        </div>
                        {/* Create new category inline */}
                        <div className="p-2 border-t border-slate-100 flex gap-2">
                          <Input placeholder="New category name…" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                            className="h-8 text-xs bg-slate-50 border-slate-200 rounded-lg px-2 flex-1" />
                          <button type="button" onClick={handleAddCategory} disabled={addingCat || !newCatName.trim()}
                            className="h-8 px-3 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ background: '#2563EB' }}>
                            {addingCat ? '…' : 'Add'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={saving}
                  className="w-full h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: '#2563EB' }}>
                  {saving ? 'Saving…' : 'Add Product'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">
            {loading ? 'Loading…' : `${filtered.length} Product${filtered.length !== 1 ? 's' : ''}`}
            {filterCategory && <span className="ml-2 text-xs font-normal text-slate-400">in {filterCategory}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Product','SKU','Category','Sell Price','Cost','Margin','Stock','Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-20 bg-slate-50" /></td>
                    ))}
                  </tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">
                    No products found. Add your first product above.
                  </td></tr>
                ) : filtered.map(p => {
                  const cost = p.buying_cost ?? 0;
                  const margin = p.price > 0 ? ((p.price - cost) / p.price) * 100 : 0;
                  const noCost = cost <= 0;
                  return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EFF6FF' }}>
                          <Package className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{p.name}</span>
                          {noCost && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span className="text-xs text-amber-600">No cost set</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="text-xs font-mono text-slate-500 whitespace-nowrap">{p.sku}</span></td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Badge className="text-xs border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>{p.category}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatAmt(p.price)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {noCost
                        ? <span className="text-xs text-amber-600 font-medium">—</span>
                        : <span className="text-sm text-slate-600 whitespace-nowrap">{formatAmt(cost)}</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {noCost
                        ? <span className="text-xs text-amber-600">Unknown</span>
                        : <span className="text-sm font-semibold" style={{ color: margin >= 20 ? '#16A34A' : margin >= 5 ? '#D97706' : '#EF4444' }}>
                            {margin.toFixed(1)}%
                          </span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {p.stock < 10 && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        <span className={`text-sm ${p.stock < 10 ? 'text-amber-600' : 'text-slate-500'}`}>{p.stock}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDuplicate(p)} title="Duplicate Product"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-500/10 transition-colors">
                          <Copy className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button onClick={() => handleEditOpen(p)} title="Edit Product"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ProductImportDialog open={importOpen} onOpenChange={setImportOpen} onComplete={load} />

      {/* Edit Product Dialog */}
      <Dialog open={!!editId} onOpenChange={o => { if (!o) setEditId(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md border-slate-200" style={{ background: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="text-slate-900">Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-2">
            {[
              { label: 'Name', key: 'name', placeholder: 'Espresso', type: 'text' },
              { label: 'SKU', key: 'sku', placeholder: 'ESP-001', type: 'text' },
              { label: 'Barcode (optional)', key: 'barcode', placeholder: 'Scan or type…', type: 'text' },
              { label: 'Selling Price', key: 'price', placeholder: '350', type: 'number' },
              { label: 'Buying Cost (Cost Price) *', key: 'buying_cost', placeholder: '200', type: 'number' },
              { label: 'Stock Qty', key: 'stock', placeholder: '100', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{f.label}</Label>
                <Input type={f.type} placeholder={f.placeholder} value={(editForm as any)[f.key]}
                  onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className={inputClass} />
              </div>
            ))}
            {/* Category */}
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Category</Label>
              <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                className={`${inputClass} w-full`}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            {/* Margin preview */}
            {editForm.price && editForm.buying_cost && (
              <div className="rounded-lg p-3 text-xs" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <span className="text-slate-600">Unit margin: </span>
                <span className="font-bold text-green-700">
                  {(((parseFloat(editForm.price) - parseFloat(editForm.buying_cost)) / parseFloat(editForm.price)) * 100).toFixed(1)}%
                  &nbsp;({(parseFloat(editForm.price) - parseFloat(editForm.buying_cost)).toFixed(2)} per unit)
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditId(null)}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={editSaving}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: '#2563EB' }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
        </DialogContent>
      </Dialog>
    </div>
  );
}
