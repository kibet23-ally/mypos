import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { BarChart3, Download, TrendingUp, DollarSign, ShoppingBag, Users } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';

const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const TT = { background: 'hsl(var(--card))', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: 12 };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#2563EB','#7C3AED','#16A34A','#D97706','#EF4444','#0891B2'];

function downloadCSV(rows: string[][], fn: string) {
  const c = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c],{type:'text/csv'})); a.download=fn; a.click();
}

export default function OWRevenueReports() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthly, setMonthly] = useState<{month:string;revenue:number;txns:number;avg:number}[]>([]);
  const [byPayment, setByPayment] = useState<{name:string;value:number}[]>([]);
  const [topProducts, setTopProducts] = useState<{name:string;revenue:number;qty:number}[]>([]);
  const [topCashiers, setTopCashiers] = useState<{name:string;revenue:number;txns:number}[]>([]);
  const [totals, setTotals] = useState({ revenue:0, txns:0, avg:0 });

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    const start = `${year}-01-01T00:00:00`;
    const end   = `${year}-12-31T23:59:59`;

    const { data: sales } = await supabase.from('sales')
      .select('total_amount,payment_method,cashier_id,cashier_name,items,created_at')
      .eq('tenant_id', appUser.tenant_id)
      .gte('created_at', start).lte('created_at', end);

    const s = sales ?? [];

    // Monthly
    const mon = MONTHS.map((m, mi) => {
      const pad = String(mi+1).padStart(2,'0');
      const slice = s.filter(x=>x.created_at.startsWith(`${year}-${pad}`));
      const revenue = slice.reduce((t,x)=>t+(x.total_amount||0),0);
      return { month: m, revenue, txns: slice.length, avg: slice.length>0?revenue/slice.length:0 };
    });
    setMonthly(mon);

    // By payment method
    const pmMap: Record<string,number> = {};
    s.forEach(x=>{ pmMap[x.payment_method]=(pmMap[x.payment_method]||0)+(x.total_amount||0); });
    setByPayment(Object.entries(pmMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value));

    // Top products
    const prodMap: Record<string,{revenue:number;qty:number}> = {};
    s.forEach(x=>{ (Array.isArray(x.items)?x.items:[]).forEach((it:{name:string;qty:number;price:number})=>{ if(!prodMap[it.name]) prodMap[it.name]={revenue:0,qty:0}; prodMap[it.name].revenue+=it.qty*it.price; prodMap[it.name].qty+=it.qty; }); });
    setTopProducts(Object.entries(prodMap).map(([name,v])=>({name,...v})).sort((a,b)=>b.revenue-a.revenue).slice(0,10));

    // Top cashiers
    const cashMap: Record<string,{revenue:number;txns:number}> = {};
    s.forEach(x=>{ const k=x.cashier_name||x.cashier_id||'Unknown'; if(!cashMap[k]) cashMap[k]={revenue:0,txns:0}; cashMap[k].revenue+=(x.total_amount||0); cashMap[k].txns++; });
    setTopCashiers(Object.entries(cashMap).map(([name,v])=>({name,...v})).sort((a,b)=>b.revenue-a.revenue).slice(0,5));

    const totalRev = s.reduce((t,x)=>t+(x.total_amount||0),0);
    setTotals({ revenue:totalRev, txns:s.length, avg:s.length>0?totalRev/s.length:0 });
    setLoading(false);
  }, [appUser?.tenant_id, year]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const rows = [['Month','Revenue','Transactions','Avg Sale'],
      ...monthly.map(m=>[m.month,String(m.revenue.toFixed(2)),String(m.txns),String(m.avg.toFixed(2))])];
    downloadCSV(rows, `revenue-${year}.csv`);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Revenue Reports</h1>
        </div>
        <div className="flex gap-2">
          {[new Date().getFullYear()-1,new Date().getFullYear()].map(y=>(
            <button key={y} onClick={()=>setYear(y)}
              className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${year===y?'bg-primary text-white border-primary':'bg-white text-muted-foreground border-border hover:bg-card'}`}>{y}</button>
          ))}
          <Button onClick={exportCSV} variant="outline" className="gap-1 h-9 text-muted-foreground"><Download className="w-4 h-4"/>Export</Button>
        </div>
      </div>

      {loading ? <div className="grid grid-cols-3 gap-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl"/>)}</div> : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            {[{label:'Total Revenue',val:totals.revenue,icon:DollarSign,color:'text-primary'},{label:'Transactions',val:totals.txns,icon:ShoppingBag,color:'text-purple-700',isCnt:true},{label:'Avg Sale Value',val:totals.avg,icon:TrendingUp,color:'text-green-700'}].map(k=>(
              <Card key={k.label} style={CARD} className="rounded-2xl">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <k.icon className={`w-4 h-4 ${k.color}`}/>
                    <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${k.color}`}>{(k as {isCnt?:boolean}).isCnt ? k.val : fmt(Number(k.val))}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Monthly revenue area */}
          <Card style={CARD}>
            <CardHeader className="pb-1"><CardTitle className="text-base text-foreground">Monthly Revenue — {year}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthly} margin={{top:4,right:8,bottom:0,left:0}}>
                  <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} width={60} tickFormatter={v=>fmt(v).replace(/\.00$/,'')}/>
                  <Tooltip contentStyle={TT} formatter={(v:number)=>[fmt(v),'']}/>
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#rg)" name="Revenue"/>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment breakdown pie */}
            <Card style={CARD}>
              <CardHeader className="pb-1"><CardTitle className="text-base text-foreground">Revenue by Payment Method</CardTitle></CardHeader>
              <CardContent>
                {byPayment.length === 0 ? <p className="text-muted-foreground text-sm py-4 text-center">No data</p> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={byPayment} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {byPayment.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={TT} formatter={(v:number)=>[fmt(v),'']}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top cashiers */}
            <Card style={CARD}>
              <CardHeader className="pb-1"><CardTitle className="text-base text-foreground">Top Cashiers by Revenue</CardTitle></CardHeader>
              <CardContent>
                {topCashiers.length === 0 ? <p className="text-muted-foreground text-sm py-4 text-center">No data</p> : (
                  <div className="space-y-2">
                    {topCashiers.map((c,i)=>(
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:COLORS[i%COLORS.length]}}>{i+1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                            <span className="text-sm font-bold text-primary shrink-0 ml-2">{fmt(c.revenue)}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full" style={{width:`${topCashiers[0].revenue>0?c.revenue/topCashiers[0].revenue*100:0}%`,background:COLORS[i%COLORS.length]}}/>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top products */}
          <Card style={CARD}>
            <CardHeader className="pb-1"><CardTitle className="text-base text-foreground">Top 10 Products by Revenue</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead><tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">#</th>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Product</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Revenue</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Qty Sold</th>
                </tr></thead>
                <tbody>{topProducts.map((p,i)=>(
                  <tr key={i} className="border-b border-border hover:bg-card">
                    <td className="py-2 px-3 text-muted-foreground">{i+1}</td>
                    <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                    <td className="py-2 px-3 text-right font-semibold text-primary">{fmt(p.revenue)}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{p.qty.toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
