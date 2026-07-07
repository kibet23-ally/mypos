import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Tag, Plus, Edit2, Trash2, Search } from 'lucide-react';

interface Category { id: string; name: string; description?: string; product_count?: number; }
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';

export default function OWCategories() {
  const { appUser } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase.from('categories')
      .select('id, name, description')
      .eq('tenant_id', appUser.tenant_id)
      .order('name');
    // Count products per category
    const cats = (data ?? []) as Category[];
    const { data: prodCounts } = await supabase.from('products')
      .select('category')
      .eq('tenant_id', appUser.tenant_id)
      .not('category', 'is', null);
    const countMap: Record<string, number> = {};
    (prodCounts ?? []).forEach((p: { category: string }) => {
      countMap[p.category] = (countMap[p.category] || 0) + 1;
    });
    setCats(cats.map(c => ({ ...c, product_count: countMap[c.name] ?? 0 })));
    setLoading(false);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description ?? '' }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Category name required'); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description || null, tenant_id: appUser?.tenant_id };
    const { error } = editing
      ? await supabase.from('categories').update({ name: payload.name, description: payload.description, updated_at: new Date().toISOString() }).eq('id', editing.id)
      : await supabase.from('categories').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Category updated' : 'Category created');
    setOpen(false); load();
  };

  const del = async (c: Category) => {
    if ((c.product_count ?? 0) > 0) { toast.error(`Cannot delete — ${c.product_count} product(s) use this category`); return; }
    if (!confirm(`Delete category "${c.name}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); load();
  };

  const filtered = cats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Product Categories</h1>
          <Badge variant="secondary">{cats.length}</Badge>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-1">
          <Plus className="w-4 h-4" />New Category
        </Button>
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className={`${inp} pl-9`} placeholder="Search categories…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading
            ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl"/>)}</div>
            : filtered.length === 0
              ? <div className="text-center py-10 text-slate-400"><Tag className="w-8 h-8 mx-auto mb-2 opacity-40"/><p>No categories yet. Create one to organize your products.</p></div>
              : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map(c => (
                    <div key={c.id} className="border border-slate-200 rounded-2xl p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                          <Tag className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(c)} className="p-1 hover:bg-white rounded-lg text-slate-500"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => del(c)} className="p-1 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm truncate">{c.name}</p>
                      {c.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{c.description}</p>}
                      <p className="text-xs text-slate-400 mt-2">{c.product_count ?? 0} product{c.product_count !== 1 ? 's' : ''}</p>
                    </div>
                  ))}
                </div>
          }
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name</Label><Input className={inp} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Beverages, Electronics…" /></div>
            <div><Label>Description (optional)</Label><Input className={inp} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Short description" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
