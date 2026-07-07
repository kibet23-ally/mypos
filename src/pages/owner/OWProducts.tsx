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
        </DialogContent>
      </Dialog>
    </div>
  );
}
