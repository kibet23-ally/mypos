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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}
