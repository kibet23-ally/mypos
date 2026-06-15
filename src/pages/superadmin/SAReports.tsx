import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Building2, Users } from 'lucide-react';

const revenue = [
  { month: 'Jan', revenue: 5382 }, { month: 'Feb', revenue: 6578 },
  { month: 'Mar', revenue: 8372 }, { month: 'Apr', revenue: 10465 },
  { month: 'May', revenue: 12279 }, { month: 'Jun', revenue: 15548 },
];

const tenantActivity = [
  { month: 'Jan', active: 15, inactive: 3 }, { month: 'Feb', active: 19, inactive: 3 },
  { month: 'Mar', active: 25, inactive: 3 }, { month: 'Apr', active: 31, inactive: 4 },
  { month: 'May', active: 38, inactive: 3 }, { month: 'Jun', active: 48, inactive: 4 },
];

const licenseStatus = [
  { name: 'Active Licenses', value: 48 },
  { name: 'Pending', value: 4 },
];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-4))'];

export default function SAReports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">Reports & Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">Aggregated insights across all tenants — YTD 2026</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: '$58,624', sub: '+21.4% MoM', icon: DollarSign },
          { label: 'Active Tenants', value: '48', sub: '92% activation rate', icon: Building2 },
          { label: 'Total Users', value: '193', sub: '+24 this month', icon: Users },
          { label: 'Avg Revenue/Tenant', value: '$299', sub: 'One-time license fee', icon: TrendingUp },
        ].map(s => (
          <Card key={s.label} className="border border-border h-full">
            <CardContent className="p-6 flex flex-col">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center mb-4 shrink-0">
                <s.icon className="w-5 h-5 text-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{s.label}</p>
              <p className="text-xs text-[hsl(var(--success))] mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Cumulative Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Active vs Inactive Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tenantActivity} barSize={18}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                  <Bar dataKey="active" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} name="Active" />
                  <Bar dataKey="inactive" fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} name="Inactive" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">License Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={licenseStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {licenseStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={revenue}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
