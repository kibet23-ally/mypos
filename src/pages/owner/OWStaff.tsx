<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import {
  Users, TrendingUp, Clock, Star, Plus, Loader2,
  Copy, Eye, EyeOff, UserPlus, Trash2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Branch } from '@/types/index';

// ─── types ────────────────────────────────────────────────────────────────────
interface StaffMember extends Profile {
  branch_name?: string;
}

interface InviteFormValues {
  full_name: string;
  username: string;
  password: string;
  branch_id: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]?.toUpperCase()).slice(0, 2).join('');
}

// ─── component ────────────────────────────────────────────────────────────────
export default function OWStaff() {
  const { appUser } = useAuth();
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [branches, setBranches]     = useState<Branch[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [removing, setRemoving]     = useState<string | null>(null);
  const [showPw, setShowPw]         = useState(false);

  // credentials reveal after creation
  const [newCreds, setNewCreds]   = useState<{ username: string; password: string } | null>(null);
  const [credsOpen, setCredsOpen] = useState(false);

  const form = useForm<InviteFormValues>({
    defaultValues: { full_name: '', username: '', password: generatePassword(), branch_id: 'none' },
  });

  // ─── fetch ─────────────────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    try {
      const [{ data: staffData, error: se }, { data: branchData, error: be }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('tenant_id', appUser.tenant_id)
          .eq('role', 'cashier')
          .order('created_at', { ascending: false }),
        supabase
          .from('branches')
          .select('*')
          .eq('tenant_id', appUser.tenant_id)
          .eq('is_active', true)
          .order('name'),
      ]);
      if (se) throw se;
      if (be) throw be;

      const branchMap = Object.fromEntries((branchData ?? []).map(b => [b.id, b.name]));
      const enriched: StaffMember[] = (staffData ?? []).map(s => ({
        ...s,
        branch_name: s.branch_id ? branchMap[s.branch_id] : undefined,
      }));

      setStaff(enriched);
      setBranches(branchData ?? []);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [appUser?.tenant_id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Auto-suggest username from full name
  const fullName = form.watch('full_name');
  useEffect(() => {
    if (fullName) {
      const suggested = fullName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      form.setValue('username', suggested, { shouldValidate: false });
    }
  }, [fullName, form]);

  // ─── add staff ─────────────────────────────────────────────────────────────
  const onSubmit = async (values: InviteFormValues) => {
    if (!appUser?.tenant_id) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-user', {
        body: {
          username:    values.username.trim(),
          password:    values.password,
          role:        'cashier',
          tenant_id:   appUser.tenant_id,
          branch_id:   values.branch_id === 'none' ? null : values.branch_id,
          full_name:   values.full_name.trim(),
        },
      });

      if (error) {
        const msg = await error?.context?.text?.();
        throw new Error(msg || error.message);
      }
      if (data?.error) throw new Error(data.error);

      setNewCreds({ username: values.username.trim(), password: values.password });
      setDialogOpen(false);
      setCredsOpen(true);
      toast.success(`Staff member ${values.full_name} added successfully`);
      fetchStaff();
      form.reset({ full_name: '', username: '', password: generatePassword(), branch_id: 'none' });
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to add staff member');
    } finally {
      setSaving(false);
    }
  };

  // ─── remove staff (soft-delete: clear tenant_id) ────────────────────────────
  const removeStaff = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from your business? They will lose access immediately.`)) return;
    setRemoving(id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tenant_id: null, branch_id: null })
        .eq('id', id)
        .eq('tenant_id', appUser?.tenant_id ?? '');
      if (error) throw error;
      toast.success(`${name} removed from your business`);
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to remove staff');
    } finally {
      setRemoving(null);
    }
  };

  // ─── chart data ─────────────────────────────────────────────────────────────
  const chartData = staff.slice(0, 6).map(s => ({
    name: (s.username ?? s.email).split('_')[0],
    joined: 1,
  }));

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground text-balance">Staff</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage cashiers and staff accounts for your business</p>
        </div>
        <Button size="sm" className="h-9 gap-1.5 shrink-0 font-medium" onClick={() => setDialogOpen(true)}>
          <UserPlus className="w-4 h-4" /><span className="hidden sm:inline">Add Staff</span>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff',    value: staff.length,                    icon: Users },
          { label: 'Branches',       value: branches.length,                 icon: TrendingUp },
          { label: 'Avg per Branch', value: branches.length ? Math.round(staff.length / branches.length) : staff.length, icon: Clock },
          { label: 'Role',           value: 'Cashier',                       icon: Star },
        ].map(s => (
          <Card key={s.label} className="border border-border h-full">
            <CardContent className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
=======
import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Plus, UserCheck, Users, Eye, EyeOff, Mail, Phone } from 'lucide-react';
import type { Profile } from '@/types/index';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const inputClass = "h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

export default function OWStaff() {
  const { appUser, signUp } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', phone_number: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  // Real metrics derived from sales — no hardcoded placeholder values.
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [activeTodayCount, setActiveTodayCount] = useState(0);

  const load = () => {
    if (!appUser?.tenant_id) return;
    supabase.from('profiles').select('*').eq('tenant_id', appUser.tenant_id).eq('role', 'cashier')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setStaff(Array.isArray(data) ? data : []); setLoading(false); });
  };

  const loadSalesMetrics = async () => {
    if (!appUser?.tenant_id) return;

    const { count: totalCount } = await supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', appUser.tenant_id);
    setTotalSalesCount(totalCount ?? 0);

    const todayStart = startOfDay(new Date()).toISOString();
    const { data: todaySales } = await supabase
      .from('sales')
      .select('cashier_id')
      .eq('tenant_id', appUser.tenant_id)
      .gte('created_at', todayStart);

    const distinctCashiersToday = new Set((todaySales ?? []).map(s => s.cashier_id)).size;
    setActiveTodayCount(distinctCashiersToday);
  };

  useEffect(load, [appUser?.tenant_id]);
  useEffect(() => { loadSalesMetrics(); }, [appUser?.tenant_id]);

  const filtered = staff.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone_number || '').toLowerCase().includes(search.toLowerCase())
  );

  // Average transactions per cashier = total sales / number of cashiers.
  // Shows 0 honestly when there are no cashiers or no sales yet, instead of a placeholder.
  const avgTransactions = staff.length > 0 ? Math.round(totalSalesCount / staff.length) : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRx.test(form.email)) { toast.error('Enter a valid email address'); return; }
    if (!form.phone_number) { toast.error('Phone number is required'); return; }
    if (!form.password || form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    const { error } = await signUp({
      email: form.email.trim(),
      phone_number: form.phone_number.trim(),
      password: form.password,
      role: 'cashier',
      tenant_id: appUser?.tenant_id || '',
    });
    setSaving(false);
    if (error) { toast.error(error.message); } else {
      toast.success('Cashier account created');
      setOpen(false);
      setForm({ email: '', phone_number: '', password: '' });
      load();
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 text-balance">Staff Management</h2>
          <p className="text-sm text-slate-500 mt-1">Cashier accounts for your business</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-900 flex items-center gap-2"
                style={{ background: '#2563EB' }}>
                <Plus className="w-4 h-4" /> Add Cashier
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md border-slate-200" style={{ background: '#ffffff' }}>
              <DialogHeader>
                <DialogTitle className="text-slate-900">Add Cashier Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="email" placeholder="cashier@example.com" value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={`${inputClass} pl-9`} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Phone number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="tel" placeholder="+1 234 567 8900" value={form.phone_number}
                      onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))} className={`${inputClass} pl-9`} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Input type={showPw ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  className="w-full h-10 rounded-xl text-sm font-semibold text-slate-900 disabled:opacity-60"
                  style={{ background: '#2563EB' }}>
                  {saving ? 'Creating…' : 'Create Cashier'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Cashiers', value: staff.length, icon: Users, color: '#2563EB' },
          { label: 'Active Today', value: activeTodayCount, icon: UserCheck, color: '#16A34A' },
          { label: 'Avg Transactions', value: avgTransactions, icon: UserCheck, color: '#7C3AED' },
        ].map(s => (
          <Card key={s.label} className="border h-full" style={CARD_STYLE}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{loading ? '–' : s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

<<<<<<< HEAD
      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Staff Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={36}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Staff']} />
                  <Bar dataKey="joined" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} name="Staff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff list */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">
            Team Members <span className="text-muted-foreground font-normal text-sm">({staff.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading staff…</span>
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No staff yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first cashier to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff.map(s => (
                <Card key={s.id} className="border border-border h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary-foreground">{initials(s.username)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{s.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="text-xs bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)]">Cashier</Badge>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={removing === s.id}
                          onClick={() => removeStaff(s.id, s.username)}
                        >
                          {removing === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Branch</span>
                        <span className="text-foreground font-medium">{s.branch_name ?? 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Added</span>
                        <span className="text-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                      <Progress value={100} className="h-1 mt-2 opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="full_name" rules={{ required: 'Full name is required' }} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Full Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Jane Wanjiku" className="px-3" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="username"
                rules={{ required: 'Username is required', pattern: { value: /^[a-z0-9_]+$/, message: 'Lowercase letters, numbers and underscores only' } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal">Username *</FormLabel>
                    <FormControl><Input placeholder="e.g. jane_wanjiku" className="px-3" {...field} /></FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">This is how they will log in to PosifyPro</p>
                  </FormItem>
                )} />
              <FormField control={form.control} name="password" rules={{ required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } }} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Temporary Password *</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={showPw ? 'text' : 'password'} className="px-3 pr-20" {...field} />
                    </FormControl>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)} className="text-muted-foreground hover:text-foreground p-1">
                        {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button type="button" tabIndex={-1} onClick={() => form.setValue('password', generatePassword())} className="text-xs text-primary hover:underline px-1">
                        New
                      </button>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="branch_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Assign to Branch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="px-3"><SelectValue placeholder="Select branch" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">No specific branch</SelectItem>
                      {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="min-w-[100px]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Staff'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Credentials Reveal Dialog */}
      <Dialog open={credsOpen} onOpenChange={setCredsOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Staff Account Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Share these login credentials with your staff member. <strong className="text-foreground">This is the only time the password is shown.</strong></p>
            {newCreds && (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="text-sm font-mono font-semibold text-foreground">{newCreds.username}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(newCreds.username, 'Username')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Password</p>
                      <p className="text-sm font-mono font-semibold text-foreground">{newCreds.password}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(newCreds.password, 'Password')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button className="w-full" onClick={() => copyToClipboard(`Username: ${newCreds.username}\nPassword: ${newCreds.password}`, 'Credentials')}>
                  <Copy className="w-4 h-4 mr-2" /> Copy Both
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setCredsOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
=======
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">
            {loading ? 'Loading…' : `${filtered.length} Cashier${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Name', 'Email', 'Role', 'Joined'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-24 bg-slate-50" /></td>
                    ))}
                  </tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">No cashiers yet. Add your first cashier above.</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 shrink-0"
                          style={{ background: '#2563EB' }}>
                          {(s.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">{s.email}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Badge className="text-xs border" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#D97706' }}>Cashier</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
    </div>
  );
}
