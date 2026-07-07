import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
<<<<<<< HEAD
import { Building2, Search, CheckCircle, XCircle } from 'lucide-react';
import type { Tenant } from '@/types/index';

=======
import { Building2, Search, CheckCircle, XCircle, Calendar } from 'lucide-react';
import type { Tenant } from '@/types/index';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };

>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
export default function SABusinesses() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
<<<<<<< HEAD
    supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTenants(Array.isArray(data) ? data : []);
        setLoading(false);
      });
=======
    supabase.from('tenants').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setTenants(Array.isArray(data) ? data : []); setLoading(false); });
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
  }, []);

  const filtered = tenants.filter(t =>
    t.business_name.toLowerCase().includes(search.toLowerCase()) ||
    t.license_key.toLowerCase().includes(search.toLowerCase())
  );

<<<<<<< HEAD
  const monthlyReg = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => ({
    month: m,
    count: [3, 4, 6, 7, 6, 11][i],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground text-balance">Businesses Registered</h2>
          <p className="text-sm text-muted-foreground mt-1">All tenant businesses on the platform</p>
        </div>
        <div className="relative shrink-0 w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search businesses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 px-3 h-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Businesses', value: tenants.length, icon: Building2 },
          { label: 'Activated', value: tenants.filter(t => t.is_activated).length, icon: CheckCircle },
          { label: 'Pending Activation', value: tenants.filter(t => !t.is_activated).length, icon: XCircle },
        ].map(s => (
          <Card key={s.label} className="border border-border h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
=======
  // Real monthly registration counts from actual tenant data (last 6 months)
  const monthlyReg = (() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      return { label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
    });
    return months.map(m => ({
      month: m.label,
      count: tenants.filter(t => {
        const d = new Date(t.created_at);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      }).length,
    }));
  })();

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 text-balance">Businesses Registered</h2>
          <p className="text-sm text-slate-500 mt-1">All tenant businesses on the platform</p>
        </div>
        <div className="relative shrink-0 w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search businesses…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Businesses', value: tenants.length, icon: Building2, color: '#2563EB' },
          { label: 'Activated', value: tenants.filter(t => t.is_activated).length, icon: CheckCircle, color: '#16A34A' },
          { label: 'Pending Activation', value: tenants.filter(t => !t.is_activated).length, icon: XCircle, color: '#D97706' },
        ].map(s => (
          <Card key={s.label} className="border h-full hover-lift" style={CARD_STYLE}>
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
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">New Registrations per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyReg} barSize={32}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'New businesses']} />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name="Registrations" />
=======
      {/* Chart */}
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900 text-balance">New Registrations per Month</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyReg} barSize={32}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#F8FAFC' }} formatter={(v: number) => [v, 'New Businesses']} />
                <Bar dataKey="count" fill="#2563EB" radius={[4,4,0,0]} name="Registrations" />
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

<<<<<<< HEAD
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">All Businesses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Business Name', 'License Key', 'Status', 'Activated', 'Registered'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">{h}</th>
=======
      {/* Table */}
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">
            {loading ? 'Loading…' : `${filtered.length} Business${filtered.length !== 1 ? 'es' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Business','License Key','Status','Created'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
                  ))}
                </tr>
              </thead>
              <tbody>
<<<<<<< HEAD
                {loading && Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-3"><Skeleton className="h-4 w-24 bg-muted" /></td>
                    ))}
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">No businesses found</td></tr>
                )}
                {!loading && filtered.map((t, i) => (
                  <tr key={t.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-6 py-3 text-sm font-medium text-foreground">{t.business_name}</td>
                    <td className="px-6 py-3 text-xs text-muted-foreground font-mono">{t.license_key.slice(0, 16)}…</td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={t.is_activated ? 'bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)]' : 'bg-[hsl(38_92%_90%)] text-[hsl(38_92%_30%)]'}>
                        {t.is_activated ? 'Active' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{t.activated_at ? new Date(t.activated_at).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
=======
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 4 }).map((__, j) => (
                        <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-24 bg-slate-50" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">No businesses found</td></tr>
                ) : (
                  filtered.map(t => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: '#EFF6FF' }}>
                            <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{t.business_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded whitespace-nowrap">
                          {t.license_key.slice(0,12)}…
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge className="text-xs border"
                          style={t.is_activated
                            ? { background: '#F0FDF4', borderColor: '#BBF7D0', color: '#16A34A' }
                            : { background: '#FFFBEB', borderColor: '#FDE68A', color: '#D97706' }}>
                          {t.is_activated ? 'Active' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
