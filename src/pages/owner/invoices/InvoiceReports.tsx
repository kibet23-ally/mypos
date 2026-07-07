import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { fetchInvoiceReportData } from '@/services/invoiceService';
import { fmt } from '@/types/invoice';
import { format, subMonths, isAfter } from 'date-fns';
import { TrendingUp, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED'];
const TT_STYLE = { background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px' };

interface Props { tenantId: string; }

export default function InvoiceReports({ tenantId }: Props) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchInvoiceReportData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6');

  useEffect(() => {
    if (!tenantId) return;
    fetchInvoiceReportData(tenantId).then(d => { setData(d); setLoading(false); });
  }, [tenantId]);

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-slate-100 rounded-xl" />)}
    </div>
  );

  if (!data) return null;

  const { summary, aging } = data;

  // Filter rows by period
  const cutoff = subMonths(new Date(), parseInt(period));
  const periodRows = data.rows.filter(r => isAfter(new Date(r.created_at), cutoff));

  // Monthly collections chart
  const monthMap: Record<string, { month: string; invoiced: number; collected: number }> = {};
  periodRows.forEach(r => {
    const key = format(new Date(r.created_at), 'MMM yy');
    if (!monthMap[key]) monthMap[key] = { month: key, invoiced: 0, collected: 0 };
    monthMap[key].invoiced += r.total;
    monthMap[key].collected += r.paid_amount;
  });
  const monthlyData = Object.values(monthMap).slice(-parseInt(period));

  // Status distribution
  const statusDist: Record<string, number> = {};
  data.rows.forEach(r => { statusDist[r.status] = (statusDist[r.status] ?? 0) + 1; });
  const pieData = Object.entries(statusDist).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-5">
      {/* Period filter */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Invoice Reports</h3>
          <p className="text-sm text-slate-500">Revenue and collection analytics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-9 w-36 bg-slate-50 border-slate-200 rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoiced', value: fmt(summary.totalInvoiced), icon: FileText, color: '#2563EB', sub: `${summary.totalCount} invoices` },
          { label: 'Collected', value: fmt(summary.totalPaid), icon: CheckCircle2, color: '#16A34A', sub: `${summary.paidCount} paid` },
          { label: 'Outstanding', value: fmt(summary.totalOutstanding), icon: TrendingUp, color: '#D97706', sub: 'unpaid balance' },
          { label: 'Overdue', value: fmt(summary.overdueAmount), icon: AlertCircle, color: '#DC2626', sub: `${summary.overdueCount} invoices` },
        ].map(k => (
          <Card key={k.label} className="border h-full" style={CARD_STYLE}>
            <CardContent className="p-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                style={{ background: `${k.color}15`, border: `1px solid ${k.color}25` }}>
                <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
              </div>
              <p className="text-lg font-bold text-slate-900">{k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              <p className="text-xs text-slate-500">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly collections chart */}
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">Monthly Collections</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={4}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TT_STYLE}
                  formatter={(v: number, name: string) => [fmt(v), name === 'invoiced' ? 'Invoiced' : 'Collected']} />
                <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }}
                  formatter={v => <span style={{ color: '#94A3B8', fontSize: 11 }}>{v === 'invoiced' ? 'Invoiced' : 'Collected'}</span>} />
                <Bar dataKey="invoiced" fill="#BFDBFE" radius={[4, 4, 0, 0]} name="invoiced" />
                <Bar dataKey="collected" fill="#2563EB" radius={[4, 4, 0, 0]} name="collected" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Status distribution pie */}
        <Card className="border" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Invoice Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TT_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Aging report */}
        <Card className="border" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Accounts Receivable Aging</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {[
              { label: '0–30 Days', ...aging.within30, color: '#D97706' },
              { label: '31–60 Days', ...aging.between3160, color: '#EA580C' },
              { label: '60+ Days', ...aging.over60, color: '#DC2626' },
            ].map(a => (
              <div key={a.label} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                  <p className="text-xs text-slate-400">{a.count} invoice{a.count !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: a.color }}>{fmt(a.amount)}</p>
                  {summary.totalOutstanding > 0 && (
                    <p className="text-xs text-slate-400">
                      {((a.amount / summary.totalOutstanding) * 100).toFixed(0)}% of outstanding
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
              <span className="font-bold text-slate-900">Total Outstanding</span>
              <span className="font-bold text-red-600">{fmt(summary.totalOutstanding)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
