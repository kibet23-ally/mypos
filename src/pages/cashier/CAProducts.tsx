<<<<<<< HEAD
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, Search, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';

type StockStatus = 'in-stock' | 'low' | 'out';

interface Item { sku: string; name: string; category: string; available: number; price: number; status: StockStatus; }

const ITEMS: Item[] = [
  { sku: 'BEV-001', name: 'Espresso Beans (1kg)', category: 'Beverages', available: 48, price: 2400, status: 'in-stock' },
  { sku: 'DAI-001', name: 'Whole Milk (1L)',       category: 'Dairy',     available: 6,  price: 250,  status: 'low' },
  { sku: 'SUP-002', name: 'Paper Cups (Lg)',        category: 'Supplies',  available: 240,price: 15,   status: 'in-stock' },
  { sku: 'BAK-001', name: 'Croissant',              category: 'Bakery',    available: 0,  price: 400,  status: 'out' },
  { sku: 'BEV-003', name: 'Vanilla Syrup',          category: 'Beverages', available: 3,  price: 1200, status: 'low' },
  { sku: 'BAK-003', name: 'Blueberry Muffin',       category: 'Bakery',    available: 14, price: 300,  status: 'in-stock' },
  { sku: 'DAI-002', name: 'Oat Milk (1L)',          category: 'Dairy',     available: 18, price: 320,  status: 'in-stock' },
  { sku: 'SUP-004', name: 'Stirrer Sticks',         category: 'Supplies',  available: 0,  price: 2,    status: 'out' },
];

const STATUS_CFG: Record<StockStatus, { label: string; cls: string }> = {
  'in-stock': { label: 'Available',   cls: 'bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)]' },
  low:        { label: 'Low Stock',   cls: 'bg-[hsl(38_92%_90%)] text-[hsl(38_92%_30%)]' },
  out:        { label: 'Unavailable', cls: 'bg-[hsl(0_72%_94%)] text-[hsl(0_72%_35%)]' },
};

const chartData = [
  { cat: 'Beverages', qty: 51 }, { cat: 'Dairy', qty: 24 },
  { cat: 'Bakery', qty: 14 },   { cat: 'Supplies', qty: 240 },
];

export default function CAProducts() {
  const [search, setSearch] = useState('');
  const { appUser } = useAuth();
  const cc = appUser?.currency_code ?? 'KES';

  const filtered = ITEMS.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const unavailable = ITEMS.filter(i => i.status === 'out');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground text-balance">Products</h2>
          <p className="text-sm text-muted-foreground mt-1">Read-only view — check availability before selling</p>
        </div>
        <div className="relative shrink-0 w-full md:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 px-3 h-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Products', value: ITEMS.length, cls: 'text-foreground' },
          { label: 'Low Stock', value: ITEMS.filter(i => i.status === 'low').length, cls: 'text-[hsl(var(--warning))]' },
          { label: 'Out of Stock', value: unavailable.length, cls: 'text-destructive' },
        ].map(s => (
          <Card key={s.label} className="border border-border h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                <Package className={`w-5 h-5 ${s.cls}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
=======
import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };

interface Product { id: string; name: string; sku: string; price: number; stock: number; category: string; }

export default function CAProducts() {
  const { appUser } = useAuth();
  const { format: formatAmt } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    if (!appUser?.tenant_id) return;
    supabase.from('products').select('*').eq('tenant_id', appUser.tenant_id).order('name')
      .then(({ data }) => { setProducts(Array.isArray(data) ? data : []); setLoading(false); });
  }, [appUser?.tenant_id]);

  const uniqueCategories = Array.from(new Set(products.map(p => p.category))).sort();

  const filtered = products
    .filter(p => !filterCategory || p.category === filterCategory)
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 text-balance">Product Catalogue</h2>
          <p className="text-sm text-slate-500 mt-1">View available products and stock levels</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="h-10 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 focus:outline-none focus:border-[#2563EB]">
            <option value="">All Categories</option>
            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative w-full md:w-56">
            {!search && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
            <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
              className={`h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3 ${!search ? 'pl-9' : 'pl-3'}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Products', value: products.length, color: '#2563EB' },
          { label: 'In Stock', value: products.filter(p => p.stock > 10).length, color: '#16A34A' },
          { label: 'Low Stock', value: products.filter(p => p.stock > 0 && p.stock <= 10).length, color: '#D97706' },
        ].map(s => (
          <Card key={s.label} className="border" style={CARD_STYLE}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-slate-900">{loading ? '–' : s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
            </CardContent>
          </Card>
        ))}
      </div>

<<<<<<< HEAD
      {unavailable.length > 0 && (
        <Card className="border border-destructive/30 bg-[hsl(0_72%_99%)]">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground text-balance">Do not sell — out of stock:</p>
              <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{unavailable.map(i => i.name).join(', ')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">Stock by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={40}>
                <XAxis dataKey="cat" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'Units']} />
                <Bar dataKey="qty" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} name="Stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">Product List ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['SKU', 'Product', 'Category', 'Price', 'In Stock', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">{h}</th>
=======
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
                  {['Product','SKU','Category','Price','Stock'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
                  ))}
                </tr>
              </thead>
              <tbody>
<<<<<<< HEAD
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">No products found</td></tr>
                ) : filtered.map((item, i) => {
                  const cfg = STATUS_CFG[item.status];
                  return (
                    <tr key={item.sku} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-6 py-3 text-xs text-muted-foreground font-mono">{item.sku}</td>
                      <td className="px-6 py-3 text-sm font-medium text-foreground">{item.name}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{item.category}</td>
                      <td className="px-6 py-3 text-sm text-foreground">{formatCurrency(item.price, cc)}</td>
                      <td className={`px-6 py-3 text-sm font-semibold ${item.available === 0 ? 'text-destructive' : item.status === 'low' ? 'text-[hsl(var(--warning))]' : 'text-foreground'}`}>{item.available}</td>
                      <td className="px-6 py-3"><Badge variant="secondary" className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge></td>
                    </tr>
                  );
                })}
=======
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 5 }).map((__, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-20 bg-slate-50" /></td>)}
                  </tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No products found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EFF6FF' }}>
                          <Package className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="text-xs font-mono text-slate-500 whitespace-nowrap">{p.sku}</span></td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Badge className="text-xs border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>{p.category}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatAmt(p.price)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {p.stock <= 10 && p.stock > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        <span className={`text-sm ${p.stock === 0 ? 'text-red-500' : p.stock <= 10 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {p.stock === 0 ? 'Out' : p.stock}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
