import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import {
  getFinancialSummaryByPeriod,
  getFinancialSummary,
  buildBuckets,
  todayRange, monthRange, yearRange, last6MonthsRange, lastNDaysRange,
  type PeriodRow,
  type FinancialSummary,
} from '@/services/calcEngine';

const CHART_COLORS = [
  'hsl(var(--chart-1))','hsl(var(--chart-2))','hsl(var(--chart-3))',
  'hsl(var(--chart-4))','hsl(var(--chart-5))',
];

type ReportType = 'daily'|'weekly'|'monthly'|'annual'|'product'|'inventory'|'customer'|'profit'|'staff';

// ReportData is now PeriodRow — standardized via calcEngine
type ReportData = PeriodRow & { period: string };

const REPORT_META: Record<ReportType, { label: string; icon: React.ElementType; description: string }> = {
  daily:     { label: 'Daily Sales',      icon: Calendar,   description: 'Hourly breakdown for today' },
  weekly:    { label: 'Weekly Report',    icon: TrendingUp, description: 'Last 7 days performance' },
  monthly:   { label: 'Monthly Report',   icon: DollarSign, description: 'This month day-by-day' },
  annual:    { label: 'Annual Report',    icon: TrendingUp, description: '6-month overview' },
  product:   { label: 'Product Report',   icon: Package,    description: 'Top products by revenue' },
  inventory: { label: 'Inventory Report', icon: Package,    description: 'Stock levels & valuation' },
  customer:  { label: 'Customer Report',  icon: Users,      description: 'Customer analytics' },
  profit:    { label: 'P&L Report',       icon: DollarSign, description: 'Real Revenue vs COGS vs Profit' },
  staff:     { label: 'Staff Report',     icon: Users,      description: 'Cashier productivity' },
};

function exportCSV(rows: ReportData[], type: ReportType) {
  const header = 'Period,Revenue,COGS,Gross Profit,Margin%,Orders,Discount,Tax\n';
  const body   = rows.map(r =>
    `${r.period},${r.revenue.toFixed(2)},${r.cogs.toFixed(2)},${r.grossProfit.toFixed(2)},${r.marginPct.toFixed(1)},${r.orders},${r.discount.toFixed(2)},${r.tax.toFixed(2)}`
  ).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url;
  a.download = `posifypro_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast.success('CSV exported');
}

function exportJSON(rows: ReportData[], type: ReportType) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url;
  a.download = `posifypro_${type}_report_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast.success('JSON exported');
}

function exportPrint() { window.print(); }

/** Map report type to calcEngine period + buckets */
function getReportConfig(rt: ReportType): {
  start: string; end: string;
  period: 'hour' | 'day' | 'month';
  buckets: { key: string; label: string }[];
} {
  const now = new Date();
  switch (rt) {
    case 'daily': {
      const r = todayRange();
      return { ...r, period: 'hour', buckets: buildBuckets('daily') };
    }
    case 'weekly': {
      const r = lastNDaysRange(7);
      return { ...r, period: 'day', buckets: buildBuckets('weekly') };
    }
    case 'monthly': {
      const r = monthRange();
      return { ...r, period: 'day', buckets: buildBuckets('monthly') };
    }
    default: { // annual, profit, product, inventory, customer, staff — use last 6 months by month
      const r = last6MonthsRange();
      return { ...r, period: 'month', buckets: buildBuckets('last6months') };
    }
  }
}

export default function OWReports() {
  const { appUser } = useAuth();
  const cc       = appUser?.currency_code ?? 'KES';
  const tenantId = appUser?.tenant_id ?? '';

  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [loading,    setLoading]    = useState(false);
  const [data,       setData]       = useState<ReportData[]>([]);
  const [summary,    setSummary]    = useState<FinancialSummary | null>(null);
  const [loaded,     setLoaded]     = useState(false);

  // KPI totals derived directly from calcEngine summary (not re-computed from period rows)
  const totalRevenue  = summary?.revenue      ?? 0;
  const totalProfit   = summary?.grossProfit  ?? 0;
  const totalCogs     = summary?.cogs         ?? 0;
  const totalOrders   = summary?.transactionCount ?? 0;
  const totalDiscount = summary?.totalDiscount ?? 0;
  const margin        = summary?.marginPct    ?? 0;

  const [payData, setPayData] = useState<{ name: string; value: number }[]>([]);

  const runReport = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const cfg = getReportConfig(reportType);

      const [periodRows, overallSummary, paymentsRes] = await Promise.all([
        getFinancialSummaryByPeriod(tenantId, cfg.start, cfg.end, cfg.period, cfg.buckets),
        getFinancialSummary(tenantId, cfg.start, cfg.end),
        supabase.from('sales').select('payment_method')
          .eq('tenant_id', tenantId).eq('status', 'completed')
          .gte('created_at', cfg.start).lte('created_at', cfg.end),
      ]);

      setData(periodRows.map(r => ({ ...r, period: r.periodKey })));
      setSummary(overallSummary);

      const pm: Record<string, number> = {};
      (paymentsRes.data ?? []).forEach((r: { payment_method: string }) => {
        pm[r.payment_method] = (pm[r.payment_method] ?? 0) + 1;
      });
      setPayData(Object.entries(pm).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value,
      })));
      setLoaded(true);
    } catch (err) {
      toast.error('Failed to load report');
      console.error(err);
    } finally { setLoading(false); }
  }, [tenantId, reportType]);

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
                  ? 'border-[hsl(var(--chart-1))] bg-accent dark:bg-primary/30'
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
            { label: 'Total Revenue',    value: formatCurrency(totalRevenue, cc),  icon: DollarSign, color: 'text-primary' },
            { label: 'Gross Profit',     value: formatCurrency(totalProfit, cc),   icon: TrendingUp,  color: 'text-emerald-600' },
            { label: 'COGS',             value: formatCurrency(totalCogs, cc),     icon: ShoppingBag, color: 'text-orange-500' },
            { label: 'Gross Margin',     value: `${margin.toFixed(1)}%`,                  icon: TrendingUp,  color: 'text-amber-600' },
            { label: 'Total Orders',     value: totalOrders.toString(),                   icon: ShoppingBag, color: 'text-violet-600' },
            { label: 'Total Discounts',  value: formatCurrency(totalDiscount, cc), icon: DollarSign,  color: 'text-sky-600' },
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
                        tickFormatter={v => formatCurrency(v, cc)} />
                      <Tooltip formatter={(v: number, name: string) => [
                        name === 'orders' ? v : formatCurrency(v, cc),
                        name.charAt(0).toUpperCase() + name.slice(1),
                      ]} />
                      <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                      <Bar dataKey="revenue"     fill="hsl(var(--chart-1))" radius={[3,3,0,0]} name="Revenue" />
                      <Line type="monotone" dataKey="grossProfit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Gross Profit" />
                      <Line type="monotone" dataKey="cogs"        stroke="hsl(var(--chart-4))" strokeWidth={1.5} dot={false} name="COGS" strokeDasharray="4 2" />
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
                      {['Period','Revenue','COGS','Gross Profit','Margin %','Orders','Discounts','Tax'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r, i) => (
                      <tr key={i} className="border-b border-border hover:bg-secondary/40 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.period}</td>
                        <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{formatCurrency(r.revenue, cc)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatCurrency(r.cogs, cc)}</td>
                        <td className="px-3 py-2.5 text-[hsl(var(--success))] font-semibold whitespace-nowrap">{formatCurrency(r.grossProfit, cc)}</td>
                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{r.marginPct.toFixed(1)}%</td>
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
                      <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">{formatCurrency(totalCogs, cc)}</td>
                      <td className="px-3 py-2.5 font-bold text-[hsl(var(--success))] whitespace-nowrap">{formatCurrency(totalProfit, cc)}</td>
                      <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">{margin.toFixed(1)}%</td>
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