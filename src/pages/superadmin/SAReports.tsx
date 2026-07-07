import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { TrendingUp, DollarSign, Building2, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-4))'];

interface SAStats {
  totalLicenseRevenue: number;
  activeTenants: number;
  totalUsers: number;
  avgRevenuePerTenant: number;
}

export default function SAReports() {
  const [stats,          setStats]          = useState<SAStats | null>(null);
  const [revenueData,    setRevenueData]    = useState<{ month: string; revenue: number }[]>([]);
  const [tenantActivity, setTenantActivity] = useState<{ month: string; active: number; inactive: number }[]>([]);
  const [licenseStatus,  setLicenseStatus]  = useState<{ name: string; value: number }[]>([]);
  const [loading,        setLoading]        = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Date range: last 6 months
      const now   = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        };
      });
      const start6m = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

      // All queries in parallel
      const [licensesRes, tenantsRes, profilesRes, licensesByMonthRes] = await Promise.all([
        supabase.from('payment_licenses').select('status, amount'),
        supabase.from('tenants').select('id, is_activated, created_at'),
        supabase.from('profiles').select('id'),
        supabase.from('payment_licenses')
          .select('amount, paid_at, status')
          .gte('paid_at', start6m),
      ]);

      const licenses     = licensesRes.data     ?? [];
      const tenants      = tenantsRes.data      ?? [];
      const profiles     = profilesRes.data     ?? [];
      const licByMonth   = licensesByMonthRes.data ?? [];

      // KPI aggregation
      const active  = licenses.filter(l => l.status === 'active').length;
      const pending = licenses.filter(l => l.status !== 'active').length;
      const totalRev = licenses
        .filter(l => l.status === 'active')
        .reduce((s, l) => s + (l.amount ?? 0), 0);
      const activeTenants = tenants.filter(t => t.is_activated).length;

      setStats({
        totalLicenseRevenue: totalRev,
        activeTenants,
        totalUsers:          profiles.length,
        avgRevenuePerTenant: activeTenants > 0 ? totalRev / activeTenants : 0,
      });

      setLicenseStatus([
        { name: 'Active Licenses', value: active  || 0 },
        { name: 'Pending',         value: pending || 0 },
      ]);

      // Revenue by month from payment_licenses paid_at
      const revMap: Record<string, number> = {};
      months.forEach(m => { revMap[m.key] = 0; });
      licByMonth.forEach(l => {
        if (l.paid_at && l.status === 'active') {
          const key = l.paid_at.substring(0, 7);
          if (revMap[key] !== undefined) revMap[key] += l.amount ?? 0;
        }
      });
      setRevenueData(months.map(m => ({ month: m.label, revenue: revMap[m.key] })));

      // Tenant activity by month (created_at)
      const tenantMap: Record<string, { active: number; inactive: number }> = {};
      months.forEach(m => { tenantMap[m.key] = { active: 0, inactive: 0 }; });
      tenants.forEach(t => {
        const key = t.created_at?.substring(0, 7);
        if (key && tenantMap[key]) {
          if (t.is_activated) tenantMap[key].active++;
          else                tenantMap[key].inactive++;
        }
      });
      setTenantActivity(months.map(m => ({ month: m.label, ...tenantMap[m.key] })));
    } catch (err) {
      toast.error('Failed to load reports');
      console.error(err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Reports &amp; Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Aggregated insights across all tenants — live from database</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 bg-muted rounded-lg" />)
          : [
              { label: 'License Revenue',     value: stats ? `$${stats.totalLicenseRevenue.toLocaleString()}` : '—', sub: 'From active licenses',   icon: DollarSign },
              { label: 'Active Tenants',       value: stats?.activeTenants.toString() ?? '—',                        sub: 'Activated businesses',    icon: Building2 },
              { label: 'Total Users',          value: stats?.totalUsers.toString() ?? '—',                           sub: 'All profiles',             icon: Users },
              { label: 'Avg Revenue / Tenant', value: stats ? `$${stats.avgRevenuePerTenant.toFixed(2)}` : '—',      sub: 'License fee per tenant',  icon: TrendingUp },
            ].map(s => (
              <Card key={s.label} className="border border-border h-full">
                <CardContent className="p-6 flex flex-col">
                  <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center mb-4 shrink-0">
                    <s.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5 text-balance">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">License Revenue (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-56 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${v.toLocaleString()}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))"
                      strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Tenant Signups — Active vs Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-56 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tenantActivity} barSize={18}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                    <Bar dataKey="active"   fill="hsl(var(--chart-1))" radius={[2,2,0,0]} name="Active" />
                    <Bar dataKey="inactive" fill="hsl(var(--chart-4))" radius={[2,2,0,0]} name="Inactive" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">License Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-52 bg-muted" /> : licenseStatus.every(l => l.value === 0) ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No license data yet</div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={licenseStatus} cx="50%" cy="50%" outerRadius={80}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {licenseStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenueData}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${v.toLocaleString()}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))"
                      strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
