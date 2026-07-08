import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp, TrendingDown, Download, DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';

const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const TT = { background: 'hsl(var(--card))', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: 12 };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function downloadCSV(rows: string[][], fn: string) {
  const c = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c],{type:'text/csv'})); a.download = fn; a.click();
}

export default function OWProfitLoss() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [monthly, setMonthly] = useState<{month:string;revenue:number;cogs:number;gross:number;expenses:number;returns:number;net:number}[]>([]);
  const [totals, setTotals] = useState({ revenue:0, cogs:0, gross:0, expenses:0, returns:0, net:0 });

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    const yearStart = `${yearFilter}-01-01T00:00:00`;
    const yearEnd   = `${yearFilter}-12-31T23:59:59`;

    // Sales (revenue + cogs + profit_amount)
    const { data: salesData } = await supabase.from('sales')
      .select('total_amount,cogs_amount,profit_amount,created_at')
      .eq('tenant_id', appUser.tenant_id)
      .gte('created_at', yearStart).lte('created_at', yearEnd);

    // Approved expenses
    const { data: expData } = await supabase.from('expenses')
      .select('total_amount,expense_date')
      .eq('tenant_id', appUser.tenant_id)
      .eq('status','approved')
      .gte('expense_date', `${yearFilter}-01-01`)
      .lte('expense_date', `${yearFilter}-12-31`);

    // Completed returns (refunded)
    const { data: retData } = await supabase.from('sales_returns')
      .select('refund_amount,created_at')
      .eq('tenant_id', appUser.tenant_id)
      .in('status',['approved','completed'])
      .gte('created_at', yearStart).lte('created_at', yearEnd);

    // Build monthly buckets
    const buckets = MONTHS.map((m, mi) => {
      const pad = String(mi+1).padStart(2,'0');
      const s = (salesData??[]).filter(x=>x.created_at.startsWith(`${yearFilter}-${pad}`));
      const e = (expData??[]).filter(x=>x.expense_date.startsWith(`${yearFilter}-${pad}`));
      const r = (retData??[]).filter(x=>x.created_at.startsWith(`${yearFilter}-${pad}`));
      const revenue   = s.reduce((t,x)=>t+(x.total_amount||0),0);
      const cogs      = s.reduce((t,x)=>t+(x.cogs_amount||0),0);
      // Gross Profit = revenue - cogs (use stored profit_amount where available, fallback to calc)
      const gross     = s.reduce((t,x)=>t+(x.profit_amount!=null?x.profit_amount:(x.total_amount||0)-(x.cogs_amount||0)),0);
      const expenses  = e.reduce((t,x)=>t+(x.total_amount||0),0);
      const returns   = r.reduce((t,x)=>t+(x.refund_amount||0),0);
      // Net Profit = Gross Profit - Expenses - Returns
      const net = gross - expenses - returns;
      return { month: m, revenue, cogs, gross, expenses, returns, net };
    });

    setMonthly(buckets);
    setTotals(buckets.reduce((acc,b)=>({
      revenue: acc.revenue+b.revenue, cogs: acc.cogs+b.cogs, gross: acc.gross+b.gross,
      expenses: acc.expenses+b.expenses, returns: acc.returns+b.returns, net: acc.net+b.net,
    }), { revenue:0, cogs:0, gross:0, expenses:0, returns:0, net:0 }));
    setLoading(false);
  }, [appUser?.tenant_id, yearFilter]);

  useEffect(() => { load(); }, [load]);

  const grossMargin = totals.revenue > 0 ? (totals.gross/totals.revenue*100).toFixed(1) : '0.0';
  const netMargin   = totals.revenue > 0 ? (totals.net/totals.revenue*100).toFixed(1) : '0.0';

  const exportCSV = () => {
    const rows = [['Month','Revenue','COGS','Gross Profit','Expenses','Returns','Net Profit'],
      ...monthly.map(m=>[m.month,String(m.revenue.toFixed(2)),String(m.cogs.toFixed(2)),String(m.gross.toFixed(2)),String(m.expenses.toFixed(2)),String(m.returns.toFixed(2)),String(m.net.toFixed(2))]),
      ['TOTAL',String(totals.revenue.toFixed(2)),String(totals.cogs.toFixed(2)),String(totals.gross.toFixed(2)),String(totals.expenses.toFixed(2)),String(totals.returns.toFixed(2)),String(totals.net.toFixed(2))]];
    downloadCSV(rows, `profit-loss-${yearFilter}.csv`);
  };

  const StatCard = ({ label, value, sub, color, icon: Icon }: { label:string;value:number;sub?:string;color:string;icon:React.ElementType }) => (
    <Card style={CARD} className="rounded-2xl">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color.replace('text-','bg-').replace('-700','-100')}`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
        <p className={`text-xl font-bold ${color}`}>{fmt(value)}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Profit & Loss</h1>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1">
            {[new Date().getFullYear()-1,new Date().getFullYear()].map(y=>(
              <button key={y} onClick={()=>setYearFilter(y)}
                className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${yearFilter===y?'bg-primary text-white border-primary':'bg-white text-muted-foreground border-border hover:bg-card'}`}>{y}</button>
            ))}
          </div>
          <Button onClick={exportCSV} variant="outline" className="gap-1 h-9 text-muted-foreground shrink-0"><Download className="w-4 h-4"/>Export</Button>
        </div>
      </div>

      {/* Profit formula note */}
      <div className="bg-accent border border-primary rounded-2xl px-4 py-3 text-xs text-primary">
        <b>Formula:</b> Gross Profit = Revenue − COGS &nbsp;|&nbsp; Net Profit = Gross Profit − Expenses − Returns
      </div>

      {loading ? <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-24 rounded-2xl"/>)}</div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Total Revenue" value={totals.revenue} color="text-primary" icon={DollarSign} />
            <StatCard label="Total COGS" value={totals.cogs} color="text-muted-foreground" icon={Package} />
            <StatCard label="Gross Profit" value={totals.gross} sub={`${grossMargin}% margin`} color={totals.gross>=0?'text-green-700':'text-red-600'} icon={TrendingUp} />
            <StatCard label="Total Expenses" value={totals.expenses} color="text-orange-600" icon={ShoppingCart} />
            <StatCard label="Returns (Refunds)" value={totals.returns} color="text-red-500" icon={TrendingDown} />
            <StatCard label="Net Profit" value={totals.net} sub={`${netMargin}% net margin`} color={totals.net>=0?'text-green-700':'text-red-600'} icon={totals.net>=0?TrendingUp:AlertTriangle} />
          </div>

          {/* Net Profit trend */}
          <Card style={CARD}>
            <CardHeader className="pb-1"><CardTitle className="text-base text-foreground">Monthly Revenue vs Net Profit — {yearFilter}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthly} margin={{top:4,right:8,bottom:0,left:0}}>
                  <defs>
                    <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient>
                    <linearGradient id="netG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16A34A" stopOpacity={0.15}/><stop offset="95%" stopColor="#16A34A" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} width={60} tickFormatter={v=>fmt(v).replace(/\.00$/,'')}/>
                  <Tooltip contentStyle={TT} formatter={(v:number)=>[fmt(v),'']}/>
                  <Legend iconType="circle" iconSize={8}/>
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revG)" name="Revenue"/>
                  <Area type="monotone" dataKey="net" stroke="#16A34A" strokeWidth={2} fill="url(#netG)" name="Net Profit"/>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gross vs Expenses vs Returns bar */}
          <Card style={CARD}>
            <CardHeader className="pb-1"><CardTitle className="text-base text-foreground">Gross Profit vs Expenses vs Returns</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly} margin={{top:4,right:8,bottom:0,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                  <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} width={60} tickFormatter={v=>fmt(v).replace(/\.00$/,'')}/>
                  <Tooltip contentStyle={TT} formatter={(v:number)=>[fmt(v),'']}/>
                  <Legend iconType="circle" iconSize={8}/>
                  <Bar dataKey="gross" fill="#16A34A" radius={[3,3,0,0]} barSize={10} name="Gross Profit"/>
                  <Bar dataKey="expenses" fill="#F59E0B" radius={[3,3,0,0]} barSize={10} name="Expenses"/>
                  <Bar dataKey="returns" fill="#EF4444" radius={[3,3,0,0]} barSize={10} name="Returns"/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* P&L Table */}
          <Card style={CARD}>
            <CardHeader className="pb-1"><CardTitle className="text-base text-foreground">Monthly P&L Statement</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead><tr className="border-b border-border">
                  {['Month','Revenue','COGS','Gross Profit','Gross %','Expenses','Returns','Net Profit','Net %'].map(h=>
                    <th key={h} className="text-right py-2 px-3 font-semibold text-muted-foreground first:text-left">{h}</th>
                  )}
                </tr></thead>
                <tbody>{monthly.map(m=>{
                  const gm = m.revenue>0?(m.gross/m.revenue*100).toFixed(1):'—';
                  const nm = m.revenue>0?(m.net/m.revenue*100).toFixed(1):'—';
                  return (
                    <tr key={m.month} className="border-b border-border hover:bg-card">
                      <td className="py-2 px-3 font-medium text-foreground">{m.month}</td>
                      <td className="py-2 px-3 text-right text-foreground">{fmt(m.revenue)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{fmt(m.cogs)}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${m.gross>=0?'text-green-700':'text-red-600'}`}>{fmt(m.gross)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground text-xs">{gm}{gm!=='—'?'%':''}</td>
                      <td className="py-2 px-3 text-right text-orange-600">{fmt(m.expenses)}</td>
                      <td className="py-2 px-3 text-right text-red-500">{fmt(m.returns)}</td>
                      <td className={`py-2 px-3 text-right font-bold ${m.net>=0?'text-green-700':'text-red-600'}`}>{fmt(m.net)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground text-xs">{nm}{nm!=='—'?'%':''}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-card font-bold">
                  <td className="py-2 px-3 text-foreground">TOTAL</td>
                  <td className="py-2 px-3 text-right text-foreground">{fmt(totals.revenue)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{fmt(totals.cogs)}</td>
                  <td className={`py-2 px-3 text-right ${totals.gross>=0?'text-green-700':'text-red-600'}`}>{fmt(totals.gross)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground text-xs">{grossMargin}%</td>
                  <td className="py-2 px-3 text-right text-orange-600">{fmt(totals.expenses)}</td>
                  <td className="py-2 px-3 text-right text-red-500">{fmt(totals.returns)}</td>
                  <td className={`py-2 px-3 text-right ${totals.net>=0?'text-green-700':'text-red-600'}`}>{fmt(totals.net)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground text-xs">{netMargin}%</td>
                </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
