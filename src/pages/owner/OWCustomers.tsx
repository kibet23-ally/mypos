import { useState, useEffect, useCallback } from 'react';
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
        </div>
      </div>

      {/* KPIs */}
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
                        </div>
                      ))}
                    </div>
                  )}
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
    </div>
  );
}
