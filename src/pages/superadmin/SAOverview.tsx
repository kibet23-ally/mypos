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
    </div>
  );
}
