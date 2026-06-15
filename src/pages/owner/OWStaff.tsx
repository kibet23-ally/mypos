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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}
