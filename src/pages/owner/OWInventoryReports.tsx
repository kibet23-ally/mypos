import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import {
  FileBarChart, AlertTriangle, Package, TrendingDown,
  Download, Search, BarChart3
} from 'lucide-react';

interface ProductRow {
  id: string; name: string; sku?: string; category: string; stock: number;
  price: number; buying_cost: number; reorder_level: number; updated_at: string;
}

const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inp = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';

type Report = 'stock' | 'low_stock' | 'valuation' | 'aging';

function downloadCSV(rows: string[][], filename: string) {
  const content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export default function OWInventoryReports() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeReport, setActiveReport] = useState<Report>('stock');
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    const { data, error } = await supabase.from('products')
      .select('id,name,sku,category,stock,price,buying_cost,reorder_level,updated_at')
      .eq('tenant_id', appUser.tenant_id).order('name');
    if (!error && data) {
      const rows = data as ProductRow[];
      setProducts(rows);
      const cats = [...new Set(rows.map(r => r.category).filter(Boolean))].sort();
      setCategories(cats);
    }
    setLoading(false);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || p.category === filterCategory;
    return matchSearch && matchCat;
  });

  const lowStock = filtered.filter(p => p.stock <= (p.reorder_level ?? 5));
  const outOfStock = filtered.filter(p => p.stock === 0);
  const totalValue = filtered.reduce((s, p) => s + p.stock * p.buying_cost, 0);
  const totalRetailValue = filtered.reduce((s, p) => s + p.stock * p.price, 0);

  const stockData = filtered;
  const valuationData = [...filtered].sort((a, b) => (b.stock * b.buying_cost) - (a.stock * a.buying_cost));
  const agingData = [...filtered].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  const fastMoving = [...filtered].sort((a, b) => b.price - a.price).slice(0, 20);

  const exportCurrent = () => {
    let rows: string[][] = [];
    let filename = '';
    if (activeReport === 'stock') {
      rows = [['Product','SKU','Category','Stock','Reorder Level','Status'],
        ...stockData.map(p => [p.name, p.sku??'', p.category, String(p.stock), String(p.reorder_level??5), p.stock===0?'Out of Stock':p.stock<=(p.reorder_level??5)?'Low Stock':'OK'])];
      filename = 'stock_report.csv';
    } else if (activeReport === 'low_stock') {
      rows = [['Product','SKU','Category','Current Stock','Reorder Level','Shortage'],
        ...lowStock.map(p => [p.name, p.sku??'', p.category, String(p.stock), String(p.reorder_level??5), String(Math.max(0,(p.reorder_level??5)-p.stock))])];
      filename = 'low_stock_report.csv';
    } else if (activeReport === 'valuation') {
      rows = [['Product','SKU','Category','Stock','Cost Price','Retail Price','Stock Value (Cost)','Stock Value (Retail)'],
        ...valuationData.map(p => [p.name, p.sku??'', p.category, String(p.stock), String(p.buying_cost), String(p.price), String((p.stock*p.buying_cost).toFixed(2)), String((p.stock*p.price).toFixed(2))])];
      filename = 'valuation_report.csv';
    } else {
      rows = [['Product','SKU','Category','Stock','Last Updated'],
        ...agingData.map(p => [p.name, p.sku??'', p.category, String(p.stock), new Date(p.updated_at).toLocaleDateString()])];
      filename = 'aging_report.csv';
    }
    downloadCSV(rows, filename);
  };

  const TABS: { key: Report; label: string; icon: React.FC<{className?:string}> }[] = [
    { key: 'stock',     label: 'Stock Levels',  icon: Package       },
    { key: 'low_stock', label: 'Low / Out',     icon: AlertTriangle },
    { key: 'valuation', label: 'Valuation',     icon: BarChart3     },
    { key: 'aging',     label: 'Aging',         icon: TrendingDown  },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileBarChart className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Inventory Reports</h1>
        </div>
        <Button onClick={exportCurrent} variant="outline" className="gap-1 h-9 text-muted-foreground"><Download className="w-4 h-4" />Export CSV</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', val: filtered.length, cls: 'text-primary' },
          { label: 'Low / Out of Stock', val: lowStock.length + ' / ' + outOfStock.length, cls: 'text-orange-600' },
          { label: 'Stock Value (Cost)', val: fmt(totalValue), cls: 'text-green-700' },
          { label: 'Retail Value', val: fmt(totalRetailValue), cls: 'text-purple-700' },
        ].map(c => (
          <Card key={c.label} style={CARD} className="rounded-2xl">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${c.cls}`}>{c.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveReport(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${activeReport === t.key ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-card'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className={`${inp} pl-9`} placeholder="Search product…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className={`${inp} w-full md:w-48`} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              {activeReport === 'stock' && (
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="border-b border-border">
                    {['Product','SKU','Category','Stock','Reorder Level','Status'].map(h =>
                      <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                    )}
                  </tr></thead>
                  <tbody>{stockData.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-card">
                      <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                      <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{p.sku || '—'}</td>
                      <td className="py-2 px-3 text-muted-foreground">{p.category}</td>
                      <td className={`py-2 px-3 font-bold ${p.stock === 0 ? 'text-red-600' : p.stock <= (p.reorder_level ?? 5) ? 'text-orange-500' : 'text-green-700'}`}>{p.stock}</td>
                      <td className="py-2 px-3 text-muted-foreground">{p.reorder_level ?? 5}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.stock === 0 ? 'bg-red-100 text-red-700' : p.stock <= (p.reorder_level ?? 5) ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                          {p.stock === 0 ? 'Out of Stock' : p.stock <= (p.reorder_level ?? 5) ? 'Low Stock' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              {activeReport === 'low_stock' && (
                lowStock.length === 0 ? <div className="text-center py-10 text-green-600 font-medium">All products are adequately stocked!</div> :
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="border-b border-border">
                    {['Product','Category','Current Stock','Reorder Level','Shortage'].map(h =>
                      <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                    )}
                  </tr></thead>
                  <tbody>{lowStock.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-orange-50">
                      <td className="py-2 px-3 font-medium text-foreground flex items-center gap-1.5">
                        {p.stock === 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}{p.name}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{p.category}</td>
                      <td className={`py-2 px-3 font-bold ${p.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>{p.stock}</td>
                      <td className="py-2 px-3 text-muted-foreground">{p.reorder_level ?? 5}</td>
                      <td className="py-2 px-3 text-red-600 font-semibold">{Math.max(0, (p.reorder_level ?? 5) - p.stock)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              {activeReport === 'valuation' && (
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="border-b border-border">
                    {['Product','Category','Stock','Cost Price','Retail Price','Cost Value','Retail Value','Margin'].map(h =>
                      <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                    )}
                  </tr></thead>
                  <tbody>
                    {valuationData.map(p => {
                      const costVal = p.stock * p.buying_cost;
                      const retVal = p.stock * p.price;
                      const margin = p.price > 0 ? ((p.price - p.buying_cost) / p.price * 100) : 0;
                      return (
                        <tr key={p.id} className="border-b border-border hover:bg-card">
                          <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{p.category}</td>
                          <td className="py-2 px-3 font-semibold text-foreground">{p.stock}</td>
                          <td className="py-2 px-3 text-muted-foreground">{fmt(p.buying_cost)}</td>
                          <td className="py-2 px-3 text-muted-foreground">{fmt(p.price)}</td>
                          <td className="py-2 px-3 font-semibold text-primary">{fmt(costVal)}</td>
                          <td className="py-2 px-3 font-semibold text-green-700">{fmt(retVal)}</td>
                          <td className="py-2 px-3">
                            <span className={`font-medium ${margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-orange-500' : 'text-red-500'}`}>{margin.toFixed(1)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-card font-bold border-t-2 border-border">
                      <td colSpan={5} className="py-2 px-3 text-right text-foreground">Total</td>
                      <td className="py-2 px-3 text-primary">{fmt(totalValue)}</td>
                      <td className="py-2 px-3 text-green-700">{fmt(totalRetailValue)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              )}
              {activeReport === 'aging' && (
                <table className="w-full text-sm whitespace-nowrap">
                  <thead><tr className="border-b border-border">
                    {['Product','Category','Stock','Last Updated','Days Since Update','Status'].map(h =>
                      <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                    )}
                  </tr></thead>
                  <tbody>{agingData.map(p => {
                    const days = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000);
                    return (
                      <tr key={p.id} className="border-b border-border hover:bg-card">
                        <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{p.category}</td>
                        <td className="py-2 px-3 font-semibold text-foreground">{p.stock}</td>
                        <td className="py-2 px-3 text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</td>
                        <td className={`py-2 px-3 font-semibold ${days > 60 ? 'text-red-600' : days > 30 ? 'text-orange-500' : 'text-green-600'}`}>{days}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${days > 60 ? 'bg-red-100 text-red-700' : days > 30 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                            {days > 60 ? 'Slow Moving' : days > 30 ? 'Moderate' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
