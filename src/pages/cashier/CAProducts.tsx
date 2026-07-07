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
            </CardContent>
          </Card>
        ))}
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
                  {['Product','SKU','Category','Price','Stock'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
