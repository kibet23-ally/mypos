<<<<<<< HEAD
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users } from 'lucide-react';

interface UserRow { id: number; username: string; role: 'superadmin' | 'owner' | 'cashier'; tenant: string; status: 'active' | 'inactive'; lastLogin: string; }

const USERS: UserRow[] = [
  { id: 1, username: 'superadmin_pos', role: 'superadmin', tenant: 'PosifyPro HQ', status: 'active', lastLogin: 'Jun 8, 2026' },
  { id: 2, username: 'owner_demo',     role: 'owner',      tenant: 'Demo Business Inc.', status: 'active', lastLogin: 'Jun 8, 2026' },
  { id: 3, username: 'cashier_demo',   role: 'cashier',    tenant: 'Demo Business Inc.', status: 'active', lastLogin: 'Jun 7, 2026' },
  { id: 4, username: 'owner_citym',    role: 'owner',      tenant: 'City Mart', status: 'active', lastLogin: 'Jun 7, 2026' },
  { id: 5, username: 'cashier_cm1',    role: 'cashier',    tenant: 'City Mart', status: 'inactive', lastLogin: 'Jun 5, 2026' },
  { id: 6, username: 'cashier_cm2',    role: 'cashier',    tenant: 'City Mart', status: 'active', lastLogin: 'Jun 8, 2026' },
];

const ROLE_COUNTS = [
  { role: 'SuperAdmin', count: 3 },
  { role: 'Owner', count: 52 },
  { role: 'Cashier', count: 138 },
];

const PIE_COLORS = ['hsl(var(--chart-3))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

const ROLE_CFG = {
  superadmin: 'bg-[hsl(221_83%_93%)] text-[hsl(221_83%_35%)]',
  owner: 'bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)]',
  cashier: 'bg-[hsl(38_92%_90%)] text-[hsl(38_92%_30%)]',
};

export default function SAUsersRoles() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">Users & Roles</h2>
        <p className="text-sm text-muted-foreground mt-1">All user accounts and their role assignments</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ROLE_COUNTS} barSize={48}>
                  <XAxis dataKey="role" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Users']} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Users">
                    {ROLE_COUNTS.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={ROLE_COUNTS} cx="50%" cy="50%" outerRadius={75} dataKey="count" nameKey="role"
                    label={({ role, percent }: { role: string; percent: number }) => `${role} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {ROLE_COUNTS.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Users']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-balance">
            <Users className="w-4 h-4" /> User Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Username', 'Role', 'Tenant', 'Status', 'Last Login'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">{h}</th>
=======
import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Shield, UserCheck } from 'lucide-react';
import type { Profile } from '@/types/index';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const ROLE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  superadmin: { bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.3)', color: '#60A5FA' },
  owner: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', color: '#22C55E' },
  cashier: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', color: '#F59E0B' },
};

export default function SAUsersRoles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProfiles(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const filtered = profiles.filter(p =>
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    total: profiles.length,
    superadmin: profiles.filter(p => p.role === 'superadmin').length,
    owner: profiles.filter(p => p.role === 'owner').length,
    cashier: profiles.filter(p => p.role === 'cashier').length,
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 text-balance">Users & Roles</h2>
          <p className="text-sm text-slate-500 mt-1">All registered users across the platform</p>
        </div>
        <div className="relative shrink-0 w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: counts.total, icon: Users, color: '#2563EB' },
          { label: 'Super Admins', value: counts.superadmin, icon: Shield, color: '#60A5FA' },
          { label: 'Owners', value: counts.owner, icon: UserCheck, color: '#16A34A' },
          { label: 'Cashiers', value: counts.cashier, icon: Users, color: '#D97706' },
        ].map(s => (
          <Card key={s.label} className="border h-full hover-lift" style={CARD_STYLE}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{loading ? '–' : s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">
            {loading ? 'Loading…' : `${filtered.length} User${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['User','Email','Role','Joined'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
                  ))}
                </tr>
              </thead>
              <tbody>
<<<<<<< HEAD
                {USERS.map((u, i) => (
                  <tr key={u.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-6 py-3 text-sm font-medium text-foreground font-mono">{u.username}</td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={`text-xs ${ROLE_CFG[u.role]}`}>{u.role}</Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{u.tenant}</td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={u.status === 'active' ? 'bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)] text-xs' : 'bg-secondary text-secondary-foreground text-xs'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{u.lastLogin}</td>
                  </tr>
                ))}
=======
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-24 bg-slate-50" /></td>
                    ))}
                  </tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">No users found</td></tr>
                ) : filtered.map(p => {
                  const rs = ROLE_STYLE[p.role] || ROLE_STYLE.cashier;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 shrink-0"
                            style={{ background: '#2563EB' }}>
                            {(p.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{p.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><span className="text-sm text-slate-500 whitespace-nowrap">{p.email}</span></td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge className="text-xs border capitalize" style={{ background: rs.bg, borderColor: rs.border, color: rs.color }}>{p.role}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
