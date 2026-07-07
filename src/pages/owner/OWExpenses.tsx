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
  Search, Plus, Wallet, Edit2, Trash2, Eye,
  ChevronLeft, ChevronRight, CheckCircle, X, Download, TrendingDown
} from 'lucide-react';

interface Expense {
  id: string; tenant_id: string; category_id?: string; category_name?: string;
  title: string; amount: number; tax_amount: number; total_amount: number;
  payment_method: string; reference?: string; expense_date: string;
  is_recurring: boolean; recur_frequency?: string; status: string;
  notes?: string; created_at: string;
}
interface ExpCategory { id: string; name: string; color: string; }

const PAGE = 15;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const STATUS_COLORS: Record<string,string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
const PAY_METHODS = ['cash','mpesa','card','bank_transfer','other'];
const RECUR_FREQ = ['monthly','weekly','yearly'];
const EMPTY_FORM = { category_id:'', category_name:'', title:'', amount:'', tax_amount:'0', payment_method:'cash', reference:'', expense_date:new Date().toISOString().slice(0,10), is_recurring:false, recur_frequency:'monthly', notes:'' };

function downloadCSV(rows: string[][], filename: string) {
  const content = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export default function OWExpenses() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const canEdit = appUser?.role === 'owner' || (appUser?.role as string) === 'manager';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalAmt, setTotalAmt] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM & { is_recurring: boolean }>(EMPTY_FORM as typeof EMPTY_FORM & { is_recurring: boolean });
  const [categories, setCategories] = useState<ExpCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('expenses').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id).order('expense_date', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`title.ilike.%${search}%,category_name.ilike.%${search}%`);
    if (filterCat) q = q.eq('category_id', filterCat);
    if (filterMonth) { const [y,m] = filterMonth.split('-'); q = q.gte('expense_date',`${y}-${m}-01`).lte('expense_date',`${y}-${m}-31`); }
    const { data, count, error } = await q;
    if (!error) { setExpenses((data ?? []) as Expense[]); setTotal(count ?? 0); }
    // Total for current filter
    let tq = supabase.from('expenses').select('total_amount').eq('tenant_id', appUser.tenant_id).eq('status','approved');
    if (filterCat) tq = tq.eq('category_id', filterCat);
    if (filterMonth) { const [y,m] = filterMonth.split('-'); tq = tq.gte('expense_date',`${y}-${m}-01`).lte('expense_date',`${y}-${m}-31`); }
    const { data: tots } = await tq;
    setTotalAmt((tots ?? []).reduce((s:number, r:{ total_amount: number }) => s + (r.total_amount || 0), 0));
    setLoading(false);
  }, [appUser?.tenant_id, page, search, filterCat, filterMonth]);

  const loadCategories = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    const { data } = await supabase.from('expense_categories').select('*').eq('tenant_id', appUser.tenant_id).order('name');
    setCategories((data ?? []) as ExpCategory[]);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM as typeof EMPTY_FORM & { is_recurring: boolean }); setOpen(true); };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({ category_id: e.category_id??'', category_name: e.category_name??'', title: e.title, amount: String(e.amount), tax_amount: String(e.tax_amount), payment_method: e.payment_method, reference: e.reference??'', expense_date: e.expense_date, is_recurring: e.is_recurring, recur_frequency: e.recur_frequency??'monthly', notes: e.notes??'' });
    setOpen(true);
  };

  const save = async () => {
    if (!appUser?.tenant_id) return;
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Amount must be positive'); return; }
    setSaving(true);
    const cat = categories.find(c => c.id === form.category_id);
    const payload = {
      tenant_id: appUser.tenant_id, category_id: form.category_id || null,
      category_name: cat?.name ?? form.category_name ?? null, title: form.title,
      amount, tax_amount: parseFloat(form.tax_amount) || 0,
      payment_method: form.payment_method, reference: form.reference || null,
      expense_date: form.expense_date, is_recurring: form.is_recurring,
      recur_frequency: form.is_recurring ? form.recur_frequency : null,
      notes: form.notes || null, status: 'approved', created_by: appUser.id,
    };
    const { error } = editing
      ? await supabase.from('expenses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      : await supabase.from('expenses').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Expense updated' : 'Expense recorded');
    setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    toast.success('Deleted'); load();
  };

  const exportCSV = () => {
    const rows = [['Date','Category','Title','Amount','Tax','Total','Payment','Status'],
      ...expenses.map(e => [e.expense_date, e.category_name??'', e.title, String(e.amount), String(e.tax_amount), String(e.total_amount), e.payment_method, e.status])];
    downloadCSV(rows, 'expenses.csv');
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Expenses</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" className="gap-1 h-9 text-slate-600"><Download className="w-4 h-4" />Export</Button>
          {canEdit && <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-1"><Plus className="w-4 h-4" />Add Expense</Button>}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card style={CARD} className="rounded-2xl">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-slate-500 font-medium">Total Approved Expenses {filterMonth ? `(${filterMonth})` : ''}</p>
            <p className="text-xl font-bold text-red-600 mt-0.5">{fmt(totalAmt)}</p>
          </CardContent>
        </Card>
        <Card style={CARD} className="rounded-2xl">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-slate-500 font-medium">This Page</p>
            <p className="text-xl font-bold text-slate-700 mt-0.5">{fmt(expenses.filter(e=>e.status==='approved').reduce((s,e)=>s+(e.total_amount||0),0))}</p>
          </CardContent>
        </Card>
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className={`${inp} pl-9`} placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <select className={`${inp} w-full md:w-48`} value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(0); }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input type="month" className={`${inp} w-full md:w-40`} value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(0); }} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><Wallet className="w-10 h-10 mx-auto mb-2 opacity-40"/><p>No expenses recorded yet.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">
                {['Date','Category','Title','Amount','Payment','Recurring','Status','Actions'].map(h=>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>
                )}
              </tr></thead>
              <tbody>{expenses.map(e => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-500">{e.expense_date}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{e.category_name||'—'}</span>
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-800">{e.title}</td>
                  <td className="py-2 px-3 font-semibold text-red-600">{fmt(e.total_amount)}</td>
                  <td className="py-2 px-3 text-slate-500 capitalize">{e.payment_method}</td>
                  <td className="py-2 px-3 text-slate-500">{e.is_recurring ? <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 capitalize">{e.recur_frequency}</span> : '—'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[e.status]??'bg-slate-100 text-slate-600'}`}>{e.status}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      {canEdit && <button onClick={()=>openEdit(e)} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Edit"><Edit2 className="w-4 h-4"/></button>}
                      {appUser?.role==='owner' && <button onClick={()=>del(e.id)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 className="w-4 h-4"/></button>}
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
                <Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="w-4 h-4"/></Button>
                <Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}><ChevronRight className="w-4 h-4"/></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <select className={`w-full ${inp}`} value={form.category_id} onChange={e=>{const c=categories.find(c=>c.id===e.target.value);setForm(f=>({...f,category_id:e.target.value,category_name:c?.name??''}));}}>
                  <option value="">— Select —</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Date</Label><Input type="date" className={inp} value={form.expense_date} onChange={e=>setForm(f=>({...f,expense_date:e.target.value}))}/></div>
            </div>
            <div><Label>Title / Description</Label><Input className={inp} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Monthly rent payment"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount</Label><Input type="number" min="0" step="0.01" className={inp} value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
              <div><Label>Tax Amount</Label><Input type="number" min="0" step="0.01" className={inp} value={form.tax_amount} onChange={e=>setForm(f=>({...f,tax_amount:e.target.value}))}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Payment Method</Label>
                <select className={`w-full ${inp}`} value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))}>
                  {PAY_METHODS.map(m=><option key={m} value={m} className="capitalize">{m.replace('_',' ')}</option>)}
                </select>
              </div>
              <div><Label>Reference</Label><Input className={inp} value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))} placeholder="Receipt #, ref…"/></div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e=>setForm(f=>({...f,is_recurring:e.target.checked}))} className="w-4 h-4 rounded" />
              <Label htmlFor="recurring" className="cursor-pointer">Recurring Expense</Label>
              {form.is_recurring && (
                <select className={`${inp} h-8 text-sm ml-2`} value={form.recur_frequency} onChange={e=>setForm(f=>({...f,recur_frequency:e.target.value}))}>
                  {RECUR_FREQ.map(f=><option key={f} value={f} className="capitalize">{f}</option>)}
                </select>
              )}
            </div>
            <div><Label>Notes</Label><Textarea className="bg-slate-50 border-slate-200 rounded-xl" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} disabled={saving}>{saving?'Saving…':editing?'Update':'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
