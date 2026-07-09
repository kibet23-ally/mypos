import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, Search, CheckCircle, XCircle } from 'lucide-react';
import type { Tenant } from '@/types/index';

export default function SABusinesses() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTenants(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const filtered = tenants.filter(t =>
    t.business_name.toLowerCase().includes(search.toLowerCase()) ||
    t.license_key.toLowerCase().includes(search.toLowerCase())
  );

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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
                  ))}
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
