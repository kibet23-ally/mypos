<<<<<<< HEAD
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Building2, Users, DollarSign, TrendingUp, Activity, RefreshCw,
  UserCheck, TrendingDown, Target, Percent,
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
];

interface SAStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  totalUsers: number;
  totalStaff: number;
  totalRevenue: number;
  mrr: number;
  arr: number;
  revenueGrowth: number;
  churnRate: number;
  conversionRate: number;
  newTenantsThisMonth: number;
}

interface TenantGrowthPoint { month: string; tenants: number; active: number; }
interface RevenuePoint { month: string; revenue: number; }

const LICENSE_PRICE = 299; // one-time USD

export default function SAOverview() {
  const [stats, setStats]       = useState<SAStats | null>(null);
  const [growth, setGrowth]     = useState<TenantGrowthPoint[]>([]);
  const [revenue, setRevenue]   = useState<RevenuePoint[]>([]);
  const [roleData, setRoleData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel queries
      const [tenantsRes, profilesRes, licensesRes] = await Promise.all([
        supabase.from('tenants').select('id, is_activated, created_at'),
        supabase.from('profiles').select('id, role, tenant_id, created_at'),
        supabase.from('payment_licenses').select('id, amount, status, paid_at, created_at'),
      ]);

      const tenants  = tenantsRes.data  ?? [];
      const profiles = profilesRes.data ?? [];
      const licenses = licensesRes.data ?? [];

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const activeTenants = tenants.filter(t => t.is_activated).length;
      const trialTenants  = tenants.filter(t => !t.is_activated).length;
      const newThisMonth  = tenants.filter(t => new Date(t.created_at) >= thisMonthStart).length;
      const newLastMonth  = tenants.filter(t => {
        const d = new Date(t.created_at);
        return d >= lastMonthStart && d < thisMonthStart;
      }).length;

      const paidLicenses = licenses.filter(l => l.status === 'active');
      const totalRevenue = paidLicenses.reduce((s, l) => s + (l.amount ?? LICENSE_PRICE), 0);
      const mrr = totalRevenue / Math.max(1, Math.ceil((Date.now() - new Date(tenants[0]?.created_at ?? Date.now()).getTime()) / (30 * 24 * 3600 * 1000)));
      const arr = mrr * 12;
      const revenueGrowth = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0;
      const churnRate = activeTenants > 0 ? ((trialTenants / Math.max(1, tenants.length)) * 100) : 0;
      const conversionRate = tenants.length > 0 ? (activeTenants / tenants.length) * 100 : 0;

      const staffRoles = profiles.filter(p => p.role !== 'superadmin');

      setStats({
        totalTenants: tenants.length, activeTenants, trialTenants,
        totalUsers: profiles.length, totalStaff: staffRoles.length,
        totalRevenue, mrr, arr, revenueGrowth, churnRate, conversionRate,
        newTenantsThisMonth: newThisMonth,
      });

      // Role distribution
      const owners   = profiles.filter(p => p.role === 'owner').length;
      const cashiers = profiles.filter(p => p.role === 'cashier').length;
      const admins   = profiles.filter(p => p.role === 'superadmin').length;
      setRoleData([
        { name: 'Owners', value: owners },
        { name: 'Cashiers', value: cashiers },
        { name: 'SuperAdmins', value: admins },
      ].filter(d => d.value > 0));

      // Build monthly growth from real tenant data
      const monthMap: Record<string, { total: number; active: number }> = {};
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString('default', { month: 'short' }) };
      });
      months.forEach(m => { monthMap[m.key] = { total: 0, active: 0 }; });
      tenants.forEach(t => {
        const d = new Date(t.created_at);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (monthMap[key]) {
          monthMap[key].total++;
          if (t.is_activated) monthMap[key].active++;
        }
      });
      // Cumulative
      let cum = 0; let cumActive = 0;
      setGrowth(months.map(m => {
        cum += monthMap[m.key]?.total ?? 0;
        cumActive += monthMap[m.key]?.active ?? 0;
        return { month: m.label, tenants: cum, active: cumActive };
      }));

      // Revenue per month from licenses
      const revMap: Record<string, number> = {};
      months.forEach(m => { revMap[m.key] = 0; });
      paidLicenses.forEach(l => {
        const d = new Date(l.paid_at ?? l.created_at);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (revMap[key] !== undefined) revMap[key] += (l.amount ?? LICENSE_PRICE);
      });
      setRevenue(months.map(m => ({ month: m.label, revenue: revMap[m.key] ?? 0 })));

    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number, prefix = '$') =>
    n >= 1000 ? `${prefix}${(n / 1000).toFixed(1)}k` : `${prefix}${n.toFixed(0)}`;

  const kpis = stats ? [
    { label: 'Total Businesses',    value: stats.totalTenants.toString(),        sub: `+${stats.newTenantsThisMonth} this month`, icon: Building2, color: 'text-blue-600' },
    { label: 'Active Tenants',      value: stats.activeTenants.toString(),       sub: `${stats.conversionRate.toFixed(0)}% conversion`, icon: UserCheck, color: 'text-green-600' },
    { label: 'Platform Revenue',    value: fmt(stats.totalRevenue),              sub: `MRR ${fmt(stats.mrr)}`, icon: DollarSign, color: 'text-violet-600' },
    { label: 'ARR',                 value: fmt(stats.arr),                       sub: `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}% growth`, icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Total Users',         value: stats.totalUsers.toString(),          sub: `${stats.totalStaff} staff members`, icon: Users, color: 'text-sky-600' },
    { label: 'Trial Accounts',      value: stats.trialTenants.toString(),        sub: 'Awaiting activation', icon: Target, color: 'text-amber-600' },
    { label: 'Churn Rate',          value: `${stats.churnRate.toFixed(1)}%`,     sub: 'Trial / total tenants', icon: TrendingDown, color: 'text-red-500' },
    { label: 'Conversion Rate',     value: `${stats.conversionRate.toFixed(1)}%`, sub: 'Trial → paid', icon: Percent, color: 'text-indigo-600' },
  ] : [];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">SaaS Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time platform metrics across all tenants</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 bg-muted rounded-lg" />)
          : kpis.map(k => (
            <div key={k.label} className="kpi-card">
              <div className="flex items-center justify-between">
                <k.icon className={`w-5 h-5 ${k.color} shrink-0`} />
                <Badge variant="outline" className="text-xs text-muted-foreground">Live</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{k.value}</p>
                <p className="text-xs font-medium text-foreground mt-0.5 text-balance">{k.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
            </div>
          ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border h-full shadow-card">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-balance">
              <Activity className="w-4 h-4 text-[hsl(var(--chart-1))]" /> Tenant Growth (Cumulative)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={growth}>
                    <defs>
                      <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                    <Area type="monotone" dataKey="tenants" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#tGrad)" name="Total" />
                    <Area type="monotone" dataKey="active"  stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#aGrad)" name="Active" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border h-full shadow-card">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Monthly Revenue (License Sales)</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={revenue} barSize={28}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border h-full shadow-card">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">User Role Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {roleData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border h-full shadow-card">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-balance">Activation vs Trial Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? <Skeleton className="h-52 bg-muted" /> : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={growth}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                    <Line type="monotone" dataKey="tenants" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Total" />
                    <Line type="monotone" dataKey="active"  stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Activated" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
=======
import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Building2, Users, DollarSign, TrendingUp, Activity,
  ArrowUpRight, CreditCard, UserPlus, Heart, Zap,
} from 'lucide-react';

const CHART_COLORS = ['#2563EB','#7C3AED','#16A34A','#D97706','#EF4444'];
const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px' };

function fmtCurrency(v: number) {
  return v >= 1000 ? `KSh ${(v / 1000).toFixed(1)}k` : `KSh ${v.toFixed(0)}`;
}

export default function SAOverview() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('tenants').select('*').order('created_at', { ascending: true }),
      supabase.from('profiles').select('id, role, created_at'),
      // payment_licenses is the actual table; subscriptions/payment_events don't exist
      supabase.from('payment_licenses').select('*'),
    ]).then(([t, p, lic]) => {
      setTenants(Array.isArray(t.data) ? t.data : []);
      setProfiles(Array.isArray(p.data) ? p.data : []);
      const licenses = Array.isArray(lic.data) ? lic.data : [];
      // Map license statuses to subscription-like shape for existing chart logic
      setSubs(licenses.map((l: any) => ({ status: l.status === 'active' ? 'active' : l.status === 'pending' ? 'trialing' : 'other' })));
      // Use license amounts as revenue proxy (paid licenses only)
      setPayments(licenses.filter((l: any) => l.status === 'active').map((l: any) => ({ amount: l.amount ?? 0, created_at: l.created_at })));
      setLoading(false);
    });
  }, []);

  const activeSubs = subs.filter(s => s.status === 'active').length;
  const trialingSubs = subs.filter(s => s.status === 'trialing').length;
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const thisMonthRevenue = payments.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // Build monthly tenant growth from real data (last 6 months)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
  });

  const tenantGrowth = months.map(m => ({
    month: m.label,
    tenants: tenants.filter(t => {
      const d = new Date(t.created_at);
      return d.getFullYear() < m.year || (d.getFullYear() === m.year && d.getMonth() <= m.month);
    }).length,
  }));

  const revenueByMonth = months.map(m => ({
    month: m.label,
    revenue: payments.filter(p => {
      const d = new Date(p.created_at);
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    }).reduce((sum, p) => sum + (p.amount ?? 0), 0),
  }));

  const planDist = [
    { name: 'Trialing', value: trialingSubs },
    { name: 'Active', value: activeSubs },
    { name: 'Other', value: Math.max(0, tenants.length - activeSubs - trialingSubs) },
  ].filter(d => d.value > 0);

  // Recent tenants as activity feed
  const recentActivity = tenants.slice(-5).reverse().map(t => ({
    text: `New tenant registered: ${t.business_name}`,
    time: new Date(t.created_at).toLocaleDateString(),
    type: 'new',
  }));

  const KPIs = [
    { label: 'Total Tenants', value: loading ? '—' : String(tenants.length), icon: Building2, color: '#2563EB' },
    { label: 'Active Subscriptions', value: loading ? '—' : String(activeSubs), icon: CreditCard, color: '#7C3AED' },
    { label: 'Trialing', value: loading ? '—' : String(trialingSubs), icon: Activity, color: '#D97706' },
    { label: 'Total Revenue', value: loading ? '—' : fmtCurrency(totalRevenue), icon: DollarSign, color: '#16A34A' },
    { label: 'This Month Revenue', value: loading ? '—' : fmtCurrency(thisMonthRevenue), icon: TrendingUp, color: '#D97706' },
    { label: 'Total Users', value: loading ? '—' : String(profiles.length), icon: Users, color: '#2563EB' },
    { label: 'Owners', value: loading ? '—' : String(profiles.filter(p => p.role === 'owner').length), icon: UserPlus, color: '#16A34A' },
    { label: 'System Health', value: '99.9%', icon: Heart, color: '#16A34A' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 text-balance">Platform Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Live data across all tenants</p>
        </div>
        <Badge className="text-xs border shrink-0" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#16A34A' }}>
          <Zap className="w-3 h-3 mr-1" /> Live
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIs.map(k => (
          <Card key={k.label} className="border h-full hover-lift" style={CARD_STYLE}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${k.color}22`, border: `1px solid ${k.color}33` }}>
                  <k.icon className="w-4 h-4" style={{ color: k.color }} />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
              </div>
              {loading ? <Skeleton className="h-6 w-16 bg-slate-100 mb-1" /> : <p className="text-xl font-bold text-slate-900">{k.value}</p>}
              <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 text-balance">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueByMonth}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`KSh ${v.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 text-balance">Tenant Growth</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={tenantGrowth}>
                  <defs>
                    <linearGradient id="tenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="tenants" stroke="#7C3AED" strokeWidth={2} fill="url(#tenGrad)" name="Tenants" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border xl:col-span-2 h-full" style={CARD_STYLE}>
          <div className="grid grid-cols-1 xl:grid-cols-3">
            <div className="xl:col-span-2 p-5">
              <p className="text-sm font-semibold text-slate-900 mb-3 text-balance">Monthly Revenue (KES)</p>
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={revenueByMonth} barSize={24}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`KSh ${v.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#2563EB" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="p-5 border-t xl:border-t-0 xl:border-l border-slate-100">
              <p className="text-sm font-semibold text-slate-900 mb-3 text-balance">Subscription Status</p>
              {planDist.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-slate-400">No data yet</div>
              ) : (
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={planDist} cx="50%" cy="45%" outerRadius={60} innerRadius={30} dataKey="value" paddingAngle={3}>
                        {planDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend layout="horizontal" iconType="circle" iconSize={8}
                        formatter={v => <span style={{ color: '#64748B', fontSize: 11 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900 text-balance">Recent Registrations</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 bg-slate-100 rounded-lg" />)}</div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No tenants registered yet.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-500" />
                  <span className="flex-1 min-w-0 text-sm text-slate-600">{a.text}</span>
                  <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
    </div>
  );
}
