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
                  ))}
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
