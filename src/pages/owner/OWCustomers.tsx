import { useState, useEffect, useCallback } from 'react';
<<<<<<< HEAD
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import {
  UserCircle2, Search, Plus, RefreshCw, Loader2, Star, TrendingUp, Users, Phone, Mail,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import type { Customer } from '@/types/index';

interface CustomerRow extends Customer {
  loyaltyPoints: number;
  segment: 'vip' | 'regular' | 'new';
}

interface CustomerForm {
  name: string; email: string; phone: string; address: string;
}

interface SaleHistory {
  id: string; receipt_number: string; total_amount: number; payment_method: string; created_at: string;
}

function calcSegment(spent: number): 'vip' | 'regular' | 'new' {
  if (spent >= 50000) return 'vip';
  if (spent >= 5000)  return 'regular';
  return 'new';
}

const SEGMENT_CFG = {
  vip:     { label: 'VIP',     cls: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950 dark:text-violet-300' },
  regular: { label: 'Regular', cls: 'badge-info' },
  new:     { label: 'New',     cls: 'badge-success' },
};

export default function OWCustomers() {
  const { appUser } = useAuth();
  const cc       = appUser?.currency_code ?? 'KES';
  const tenantId = appUser?.tenant_id ?? '';

  const [customers,   setCustomers]   = useState<CustomerRow[]>([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [selected,    setSelected]    = useState<CustomerRow | null>(null);
  const [history,     setHistory]     = useState<SaleHistory[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [growthData,  setGrowthData]  = useState<{ month: string; customers: number }[]>([]);
  const [topSpenders, setTopSpenders] = useState<{ name: string; spent: number }[]>([]);

  const form = useForm<CustomerForm>({
    defaultValues: { name: '', email: '', phone: '', address: '' },
  });

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_spent', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []).map(c => ({
        ...c,
        loyaltyPoints: Math.floor(c.total_spent / 100),
        segment: calcSegment(c.total_spent),
      }));
      setCustomers(rows);
      setTopSpenders(rows.slice(0, 5).map(r => ({ name: r.name.split(' ')[0], spent: r.total_spent })));

      // Growth
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('default', { month: 'short' }) };
      });
      const mMap: Record<string, number> = {};
      months.forEach(m => { mMap[m.key] = 0; });
      (data ?? []).forEach(c => {
        const key = c.created_at.substring(0, 7);
        if (mMap[key] !== undefined) mMap[key]++;
      });
      let cum = 0;
      setGrowthData(months.map(m => { cum += mMap[m.key]; return { month: m.label, customers: cum }; }));
    } catch (err) {
      toast.error('Failed to load customers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const loadHistory = async (customerId: string) => {
    setHistLoading(true);
    try {
      const { data } = await supabase
        .from('sales')
        .select('id, receipt_number, total_amount, payment_method, created_at')
        .eq('customer_id', customerId)
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      setHistory(data ?? []);
    } catch { setHistory([]); }
    finally { setHistLoading(false); }
  };

  const handleSelect = (c: CustomerRow) => {
    setSelected(c);
    loadHistory(c.id);
  };

  const handleSave = async (values: CustomerForm) => {
    if (!values.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('customers').insert({
        tenant_id: tenantId,
        name: values.name.trim(),
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        address: values.address.trim() || null,
        total_purchases: 0,
        total_spent: 0,
      });
      if (error) throw error;
      toast.success('Customer added');
      setDialogOpen(false);
      form.reset();
      await load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  );

  const vipCount     = customers.filter(c => c.segment === 'vip').length;
  const regularCount = customers.filter(c => c.segment === 'regular').length;
  const totalSpent   = customers.reduce((s, c) => s + c.total_spent, 0);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Customer Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Profiles, purchase history, and loyalty</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-3.5 h-3.5" />
            Add Customer
          </Button>
=======
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Search, Plus, Users, Edit2, Trash2, Eye, X,
  Phone, Mail, MapPin, Star, CreditCard, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface Customer {
  id: string; tenant_id: string; name: string; phone: string | null; email: string | null;
  address: string | null; balance: number; loyalty_points: number; notes: string | null; created_at: string;
}
interface Sale { id: string; transaction_id: string; total: number; payment_method: string; created_at: string; }

const PAGE = 20;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = "h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3";
const EMPTY_FORM = { name: '', phone: '', email: '', address: '', notes: '' };

export default function OWCustomers() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [detailSales, setDetailSales] = useState<Sale[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('customers').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id).order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.ilike('name', `%${search}%`);
    const { data, count } = await q;
    setCustomers(Array.isArray(data) ? data : []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (c: Customer) => {
    setDetail(c);
    setDetailLoading(true);
    const { data } = await supabase.from('sales').select('id, transaction_id, total, payment_method, created_at')
      .eq('customer_id', c.id).order('created_at', { ascending: false }).limit(20);
    setDetailSales(Array.isArray(data) ? data : []);
    setDetailLoading(false);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', notes: c.notes ?? '' });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = { name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null, tenant_id: appUser?.tenant_id };
    const { error } = editing
      ? await supabase.from('customers').update(payload).eq('id', editing.id)
      : await supabase.from('customers').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); } else {
      toast.success(editing ? 'Customer updated' : 'Customer added');
      setOpen(false); setEditing(null); setForm(EMPTY_FORM); load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Customer deleted'); load(); }
  };

  const exportCSV = () => {
    const rows = [['Name','Phone','Email','Balance','Loyalty Points','Created'].join(','),
      ...customers.map(c => [c.name, c.phone ?? '', c.email ?? '', c.balance, c.loyalty_points, c.created_at.slice(0, 10)].join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click();
  };

  const totalPages = Math.ceil(total / PAGE);
  const totalBalance = customers.reduce((s, c) => s + c.balance, 0);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage customer profiles, balances and loyalty</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV} className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); setForm(EMPTY_FORM); } }}>
            <DialogTrigger asChild>
              <button className="h-9 px-4 rounded-xl text-sm font-semibold text-white flex items-center gap-2" style={{ background: '#2563EB' }}>
                <Plus className="w-4 h-4" /> Add Customer
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-slate-200" style={{ background: '#ffffff' }}>
              <DialogHeader><DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-3 mt-2">
                {[
                  { label: 'Full Name *', key: 'name', placeholder: 'John Doe', type: 'text' },
                  { label: 'Phone', key: 'phone', placeholder: '+254 700 000 000', type: 'tel' },
                  { label: 'Email', key: 'email', placeholder: 'john@example.com', type: 'email' },
                  { label: 'Address', key: 'address', placeholder: 'Nairobi, Kenya', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{f.label}</Label>
                    <Input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className={inp} />
                  </div>
                ))}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Notes</Label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Optional notes…" rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
                <button type="submit" disabled={saving} className="w-full h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#2563EB' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Customer'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
        </div>
      </div>

      {/* KPIs */}
<<<<<<< HEAD
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 bg-muted rounded-lg" />) : [
          { label: 'Total Customers', value: customers.length.toString(),      icon: Users,     color: 'text-blue-600' },
          { label: 'VIP Customers',   value: vipCount.toString(),              icon: Star,      color: 'text-violet-600' },
          { label: 'Regular',         value: regularCount.toString(),          icon: UserCircle2, color: 'text-emerald-600' },
          { label: 'Total Lifetime Spend', value: formatCurrencyCompact(totalSpent, cc), icon: TrendingUp, color: 'text-amber-600' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 px-3" />
          </div>

          <Card className="border border-border shadow-card">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 bg-muted" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <UserCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No customers found
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-secondary/50 transition-colors ${selected?.id === c.id ? 'bg-secondary' : ''}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 text-primary-foreground text-sm font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${SEGMENT_CFG[c.segment].cls}`}>
                            {SEGMENT_CFG[c.segment].label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {c.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                          {c.email && <span className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{c.email}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">{formatCurrencyCompact(c.total_spent, cc)}</p>
                        <p className="text-xs text-muted-foreground">{c.total_purchases} orders</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <Card className="border border-border shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0">
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate text-balance">{selected.name}</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${SEGMENT_CFG[selected.segment].cls}`}>
                        {SEGMENT_CFG[selected.segment].label}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {selected.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5 shrink-0" />{selected.phone}</div>}
                    {selected.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{selected.email}</span></div>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {[
                      { label: 'Total Spent', value: formatCurrencyCompact(selected.total_spent, cc) },
                      { label: 'Orders',      value: selected.total_purchases.toString() },
                      { label: 'Loyalty Pts', value: selected.loyaltyPoints.toLocaleString() },
                      { label: 'Member Since', value: new Date(selected.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' }) },
                    ].map(s => (
                      <div key={s.label} className="bg-secondary rounded p-2.5">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-card">
                <CardHeader className="pb-2 px-5 pt-4">
                  <CardTitle className="text-sm font-semibold text-balance">Purchase History</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {histLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 bg-muted" />)}</div>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No purchases yet</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {history.map(s => (
                        <div key={s.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
                          <div>
                            <p className="text-xs font-medium text-foreground">{s.receipt_number}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {s.payment_method} · {new Date(s.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-foreground shrink-0">{formatCurrency(s.total_amount, cc)}</p>
=======
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Customers', value: total },
          { label: 'Outstanding Balance', value: fmt(totalBalance) },
          { label: 'Credit Customers', value: customers.filter(c => c.balance > 0).length },
          { label: 'Loyalty Members', value: customers.filter(c => c.loyalty_points > 0).length },
        ].map(k => (
          <Card key={k.label} className="border" style={CARD}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">{k.label}</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '–' : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        {!search && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
        <Input placeholder="Search customers…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          className={`h-10 bg-white border-slate-200 rounded-xl px-3 ${!search ? 'pl-9' : 'pl-3'}`} />
      </div>

      {/* Table */}
      <Card className="border" style={CARD}>
        <CardHeader className="px-5 pt-5 pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">{loading ? 'Loading…' : `${total} Customer${total !== 1 ? 's' : ''}`}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Customer','Phone','Email','Balance','Loyalty Pts','Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-20 bg-slate-50" /></td>)}
                  </tr>
                )) : customers.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No customers found. Add your first customer.</td></tr>
                ) : customers.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: '#2563EB' }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{c.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{c.email ?? '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${c.balance > 0 ? 'text-red-600' : 'text-slate-700'}`}>{fmt(c.balance)}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-sm text-slate-700">{c.loyalty_points}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openDetail(c)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button onClick={() => openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100">
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">{page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}</span>
              <div className="flex gap-1.5">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5 text-slate-600" /></button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5 text-slate-600" /></button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col" style={{ background: '#ffffff', borderColor: '#E2E8F0', maxHeight: '88vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0" style={{ background: '#2563EB' }}>
                  {detail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{detail.name}</p>
                  <p className="text-xs text-slate-400">Since {detail.created_at.slice(0, 10)}</p>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Phone, label: 'Phone', value: detail.phone ?? '—' },
                  { icon: Mail, label: 'Email', value: detail.email ?? '—' },
                  { icon: MapPin, label: 'Address', value: detail.address ?? '—' },
                  { icon: CreditCard, label: 'Balance', value: fmt(detail.balance) },
                  { icon: Star, label: 'Loyalty Points', value: `${detail.loyalty_points} pts` },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-3 flex items-start gap-2.5">
                    <f.icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">{f.label}</p>
                      <p className="text-sm font-medium text-slate-800">{f.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {detail.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">{detail.notes}</div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Purchase History</p>
                {detailLoading ? <Skeleton className="h-20 w-full bg-slate-50 rounded-xl" />
                  : detailSales.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No purchases yet</p>
                  : (
                    <div className="space-y-2">
                      {detailSales.map(s => (
                        <div key={s.id} className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-slate-50 text-sm">
                          <div>
                            <p className="font-mono text-xs text-blue-600 font-semibold">{s.transaction_id}</p>
                            <p className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{fmt(s.total)}</p>
                            <p className="text-xs capitalize text-slate-400">{s.payment_method}</p>
                          </div>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
                        </div>
                      ))}
                    </div>
                  )}
<<<<<<< HEAD
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border border-border shadow-card">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                <UserCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Select a customer to view details
              </CardContent>
            </Card>
          )}

          {/* Analytics */}
          <Card className="border border-border shadow-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-sm font-semibold text-balance">Customer Growth</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {loading ? <Skeleton className="h-36 bg-muted" /> : (
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="cgGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="customers" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#cgGrad2)" name="Customers" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border shadow-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-sm font-semibold text-balance">Top Spenders</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {loading ? <Skeleton className="h-36 bg-muted" /> : topSpenders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
              ) : (
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={topSpenders} layout="vertical" barSize={12}>
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v, cc)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v, cc), 'Spent']} />
                      <Bar dataKey="spent" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Spent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add customer dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField control={form.control} name="name" rules={{ required: 'Name is required' }} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Full Name *</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} className="h-9 px-3" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Phone</FormLabel>
                  <FormControl><Input placeholder="+254 7XX XXX XXX" {...field} className="h-9 px-3" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Email</FormLabel>
                  <FormControl><Input type="email" placeholder="john@example.com" {...field} className="h-9 px-3" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Address</FormLabel>
                  <FormControl><Input placeholder="123 Main St" {...field} className="h-9 px-3" /></FormControl>
                </FormItem>
              )} />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Customer'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
=======
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
              <button onClick={() => { openEdit(detail); setDetail(null); }} className="flex-1 h-9 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
              <button onClick={() => setDetail(null)} className="flex-1 h-9 rounded-xl text-sm font-bold text-white" style={{ background: '#2563EB' }}>Close</button>
            </div>
          </div>
        </div>
      )}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
    </div>
  );
}
