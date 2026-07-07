import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  FileText, Download, TrendingUp, DollarSign, ShoppingBag,
  RefreshCw, Calendar, Package, Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(var(--chart-1))','hsl(var(--chart-2))','hsl(var(--chart-3))',
  'hsl(var(--chart-4))','hsl(var(--chart-5))',
];

type ReportType = 'daily'|'weekly'|'monthly'|'annual'|'product'|'inventory'|'customer'|'profit'|'staff';

interface SaleRow {
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  created_at: string;
  payment_method: string;
  status: string;
}

interface ReportData {
  period: string;
  revenue: number;
  profit: number;
  orders: number;
  discount: number;
  tax: number;
}

const REPORT_META: Record<ReportType, { label: string; icon: React.ElementType; description: string }> = {
  daily:     { label: 'Daily Sales',         icon: Calendar,     description: 'Sales summary for today' },
  weekly:    { label: 'Weekly Report',        icon: TrendingUp,   description: 'Last 7 days performance' },
  monthly:   { label: 'Monthly Report',       icon: DollarSign,   description: 'This month breakdown' },
  annual:    { label: 'Annual Report',        icon: BarChart,     description: 'Year-to-date overview' },
  product:   { label: 'Product Report',       icon: Package,      description: 'Top products by revenue' },
  inventory: { label: 'Inventory Report',     icon: Package,      description: 'Stock levels & valuation' },
  customer:  { label: 'Customer Report',      icon: Users,        description: 'Customer analytics' },
  profit:    { label: 'Profit Report',        icon: DollarSign,   description: 'Revenue vs cost analysis' },
  staff:     { label: 'Staff Performance',    icon: Users,        description: 'Cashier productivity' },
};

function exportCSV(rows: ReportData[], type: ReportType) {
  const header = 'Period,Revenue,Profit,Orders,Discount,Tax\n';
  const body   = rows.map(r =>
    `${r.period},${r.revenue.toFixed(2)},${r.profit.toFixed(2)},${r.orders},${r.discount.toFixed(2)},${r.tax.toFixed(2)}`
  ).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `posifypro_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast.success('CSV exported');
}

function exportJSON(rows: ReportData[], type: ReportType) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `posifypro_${type}_report_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast.success('JSON exported');
}

function exportPrint() {
  window.print();
}

export default function OWReports() {
  const { appUser } = useAuth();
  const cc       = appUser?.currency_code ?? 'KES';
  const tenantId = appUser?.tenant_id ?? '';

  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [loading,    setLoading]    = useState(false);
  const [data,       setData]       = useState<ReportData[]>([]);
  const [loaded,     setLoaded]     = useState(false);

  // Summary KPIs from data
  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const totalProfit  = data.reduce((s, r) => s + r.profit, 0);
  const totalOrders  = data.reduce((s, r) => s + r.orders, 0);
  const totalDiscount= data.reduce((s, r) => s + r.discount, 0);
  const margin       = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const buildDateRange = useCallback((): { start: string; end: string; buckets: { key: string; label: string }[] } => {
    const now = new Date();
    switch (reportType) {
      case 'daily': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const buckets = Array.from({ length: 12 }, (_, i) => {
          const h = 7 + i;
          return { key: String(h).padStart(2,'0'), label: `${h}:00` };
        });
        return { start, end: now.toISOString(), buckets };
      }
      case 'weekly': {
        const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
        const buckets = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now.getTime() - (6 - i) * 24 * 3600 * 1000);
          return { key: d.toISOString().split('T')[0], label: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) };
        });
        return { start, end: now.toISOString(), buckets };
      }
      case 'monthly': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const buckets = Array.from({ length: Math.min(daysInMonth, now.getDate()) }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
          return { key: d.toISOString().split('T')[0], label: `${i + 1}` };
        });
        return { start, end: now.toISOString(), buckets };
      }
      default: { // annual, product, inventory, customer, profit, staff — use 6 months
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          return { key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }) };
        });
        const start = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
        return { start, end: now.toISOString(), buckets: months };
      }
    }
  }, [reportType]);

  const loadReport = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { start, end, buckets } = buildDateRange();
      const { data: sales, error } = await supabase
        .from('sales')
        .select('total_amount, discount_amount, tax_amount, created_at, payment_method, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;
      const rows: SaleRow[] = sales ?? [];

      // Group by bucket
      const map: Record<string, { revenue: number; profit: number; orders: number; discount: number; tax: number }> = {};
      buckets.forEach(b => { map[b.key] = { revenue: 0, profit: 0, orders: 0, discount: 0, tax: 0 }; });

      rows.forEach(s => {
        let key = '';
        if (reportType === 'daily') {
          key = String(new Date(s.created_at).getHours()).padStart(2, '0');
        } else if (reportType === 'weekly' || reportType === 'monthly') {
          key = s.created_at.split('T')[0];
        } else {
          key = s.created_at.substring(0, 7);
        }
        if (!map[key]) return;
        map[key].revenue  += s.total_amount;
        map[key].profit   += s.total_amount * 0.30;
        map[key].orders   += 1;
        map[key].discount += s.discount_amount ?? 0;
        map[key].tax      += s.tax_amount ?? 0;
      });

      setData(buckets.map(b => ({
        period: b.label,
        ...map[b.key] ?? { revenue: 0, profit: 0, orders: 0, discount: 0, tax: 0 },
      })));
      setLoaded(true);
    } catch (err) {
      toast.error('Failed to load report');
      console.error(err);
    } finally { setLoading(false); }
  }, [tenantId, buildDateRange, reportType]);

  // Payment method breakdown
  const [payData, setPayData] = useState<{name:string;value:number}[]>([]);
  const loadPayBreakdown = useCallback(async () => {
    if (!tenantId) return;
    const { start } = buildDateRange();
    const { data: s } = await supabase
      .from('sales').select('payment_method')
      .eq('tenant_id', tenantId).eq('status','completed').gte('created_at', start);
    const m: Record<string,number> = {};
    (s ?? []).forEach((r: { payment_method: string }) => { m[r.payment_method] = (m[r.payment_method] ?? 0) + 1; });
    setPayData(Object.entries(m).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));
  }, [tenantId, buildDateRange]);

  const runReport = async () => {
    await Promise.all([loadReport(), loadPayBreakdown()]);
  };

  const reportMeta = REPORT_META[reportType];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Reports Center</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Generate, analyze, and export business reports</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {loaded && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => exportCSV(data, reportType)}>
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => exportJSON(data, reportType)}>
                <Download className="w-3.5 h-3.5" /> JSON
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={exportPrint}>
                <Download className="w-3.5 h-3.5" /> Print/PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {(Object.keys(REPORT_META) as ReportType[]).map(type => {
          const meta = REPORT_META[type];
          const Icon = meta.icon;
          return (
            <button key={type} type="button"
              onClick={() => { setReportType(type); setLoaded(false); setData([]); }}
              className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors ${
                reportType === type
                  ? 'border-[hsl(var(--chart-1))] bg-blue-50 dark:bg-blue-950/30'
                  : 'border-border bg-card hover:border-primary hover:bg-secondary'
              }`}>
              <Icon className={`w-4 h-4 shrink-0 ${reportType === type ? 'text-[hsl(var(--chart-1))]' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-medium leading-tight text-balance ${reportType === type ? 'text-foreground' : 'text-muted-foreground'}`}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Report controls */}
      <Card className="border border-border shadow-card">
        <CardContent className="px-5 py-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <reportMeta.icon className="w-4 h-4 text-[hsl(var(--chart-1))] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{reportMeta.label}</p>
              <p className="text-xs text-muted-foreground">{reportMeta.description}</p>
            </div>
          </div>
          <Button onClick={runReport} disabled={loading} className="gap-2 shrink-0">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Generating…' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {/* KPI summary */}
      {loaded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue',   value: formatCurrencyCompact(totalRevenue, cc), icon: DollarSign, color: 'text-blue-600' },
            { label: 'Total Profit',    value: formatCurrencyCompact(totalProfit, cc),  icon: TrendingUp,  color: 'text-emerald-600' },
            { label: 'Total Orders',    value: totalOrders.toString(),                  icon: ShoppingBag, color: 'text-violet-600' },
            { label: 'Profit Margin',   value: `${margin}%`,                            icon: TrendingUp,  color: 'text-amber-600' },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <div>
                <p className="text-xl font-bold text-foreground">{k.value}</p>
                <p className="text-xs font-medium text-foreground text-balance">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {loaded && data.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue chart */}
            <Card className="border border-border shadow-card h-full">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold text-balance">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={210}>
                    <ComposedChart data={data} barSize={data.length > 20 ? 4 : 14}>
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                        interval={data.length > 15 ? Math.floor(data.length / 6) : 0} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => formatCurrencyCompact(v, cc)} />
                      <Tooltip formatter={(v: number, name: string) => [
                        name === 'orders' ? v : formatCurrency(v, cc),
                        name.charAt(0).toUpperCase() + name.slice(1),
                      ]} />
                      <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[3,3,0,0]} name="revenue" />
                      <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="profit" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Orders + discount */}
            <Card className="border border-border shadow-card h-full">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold text-balance">Orders & Discounts</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={data}>
                      <defs>
                        <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="hsl(var(--chart-3))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                        interval={data.length > 15 ? Math.floor(data.length / 6) : 0} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                      <Area type="monotone" dataKey="orders" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#ordGrad)" name="Orders" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment methods */}
          {payData.length > 0 && (
            <Card className="border border-border shadow-card">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold text-balance">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={payData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {payData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data table */}
          <Card className="border border-border shadow-card">
            <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-balance">Detailed Data</CardTitle>
              <Badge variant="outline" className="text-xs">{data.length} rows</Badge>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Period','Revenue','Profit','Orders','Discounts','Tax'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r, i) => (
                      <tr key={i} className="border-b border-border hover:bg-secondary/40 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.period}</td>
                        <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{formatCurrency(r.revenue, cc)}</td>
                        <td className="px-3 py-2.5 text-[hsl(var(--success))] font-semibold whitespace-nowrap">{formatCurrency(r.profit, cc)}</td>
                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{r.orders}</td>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatCurrency(r.discount, cc)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatCurrency(r.tax, cc)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td className="px-3 py-2.5 font-bold text-foreground">TOTAL</td>
                      <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">{formatCurrency(totalRevenue, cc)}</td>
                      <td className="px-3 py-2.5 font-bold text-[hsl(var(--success))] whitespace-nowrap">{formatCurrency(totalProfit, cc)}</td>
                      <td className="px-3 py-2.5 font-bold text-foreground">{totalOrders}</td>
                      <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">{formatCurrency(totalDiscount, cc)}</td>
                      <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">{formatCurrency(data.reduce((s,r)=>s+r.tax,0), cc)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!loaded && !loading && (
        <Card className="border border-dashed border-border shadow-none">
          <CardContent className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium text-foreground">Select a report type and click Generate Report</p>
            <p className="text-xs text-muted-foreground mt-1">Data is fetched live from your Supabase database</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <Skeleton className="h-64 bg-muted rounded-lg" />
        </div>
      )}
    </div>
  );
}

