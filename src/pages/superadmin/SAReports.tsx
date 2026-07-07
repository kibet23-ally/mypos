import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Users, Activity } from 'lucide-react';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px' };

export default function SAReports() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('tenants').select('id, created_at').order('created_at', { ascending: true }),
      supabase.from('profiles').select('id, role, created_at'),
      supabase.from('payment_events').select('amount, created_at').eq('event_type', 'payment_success'),
    ]).then(([t, p, pe]) => {
      setTenants(Array.isArray(t.data) ? t.data : []);
      setProfiles(Array.isArray(p.data) ? p.data : []);
      setPayments(Array.isArray(pe.data) ? pe.data : []);
      setLoading(false);
    });
  }, []);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
  });

  const monthly = months.map(m => ({
    month: m.label,
    revenue: payments.filter(p => {
      const d = new Date(p.created_at);
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    }).reduce((sum, p) => sum + (p.amount ?? 0), 0),
    tenants: tenants.filter(t => {
      const d = new Date(t.created_at);
      return d.getFullYear() < m.year || (d.getFullYear() === m.year && d.getMonth() <= m.month);
    }).length,
    users: profiles.filter(p => {
      const d = new Date(p.created_at);
      return d.getFullYear() < m.year || (d.getFullYear() === m.year && d.getMonth() <= m.month);
    }).length,
  }));

  const totalRevenue = payments.reduce((s, p) => s + (p.amount ?? 0), 0);

  const SUMMARIES = [
    { label: 'Total Revenue', value: loading ? '—' : `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: '#2563EB' },
    { label: 'Total Tenants', value: loading ? '—' : String(tenants.length), icon: Activity, color: '#16A34A' },
    { label: 'Total Users', value: loading ? '—' : String(profiles.length), icon: Users, color: '#7C3AED' },
    { label: 'Owners', value: loading ? '—' : String(profiles.filter(p => p.role === 'owner').length), icon: TrendingUp, color: '#D97706' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 text-balance">Reports & Analytics</h2>
        <p className="text-sm text-slate-500 mt-1">Platform-wide performance — live Supabase data</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SUMMARIES.map(s => (
          <Card key={s.label} className="border h-full hover-lift" style={CARD_STYLE}>
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              {loading ? <Skeleton className="h-6 w-16 bg-slate-100 mb-1" /> : <p className="text-xl font-bold text-slate-900">{s.value}</p>}
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 text-balance">Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`KSh ${v.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGrad2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 text-balance">Monthly Revenue (Bar)</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly} barSize={20}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`KSh ${v.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#7C3AED" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border xl:col-span-2 h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 text-balance">User & Tenant Growth</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthly}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} formatter={v => <span style={{ color: '#64748B', fontSize: 11 }}>{v}</span>} />
                  <Line type="monotone" dataKey="users" stroke="#16A34A" strokeWidth={2} dot={false} name="Users" />
                  <Line type="monotone" dataKey="tenants" stroke="#D97706" strokeWidth={2} dot={false} name="Tenants" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
