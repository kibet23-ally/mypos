import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/useCurrency';
import { BarChart3, TrendingUp, DollarSign, Users, Crown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';

const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const TT = { background: 'hsl(var(--card))', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: 12 };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface TenantRevRow { plan: string; count: number; }

export default function SARevenue() {
  const { format: fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [byPlan, setByPlan] = useState<TenantRevRow[]>([]);
  const [monthly, setMonthly] = useState<{month:string;tenants:number}[]>([]);
  const [totals, setTotals] = useState({ total:0, active:0, trial:0, paid:0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: tenants } = await supabase.from('tenants').select('plan,plan_expires_at,suspended,created_at');
    const t = tenants ?? [];
    const now = new Date();
    const active = t.filter(x => !x.suspended && (!x.plan_expires_at || new Date(x.plan_expires_at) > now));
    const trial = active.filter(x => x.plan === 'trial');
    const paid = active.filter(x => x.plan && x.plan !== 'trial');
    // By plan
    const planMap: Record<string,number> = {};
    t.forEach(x=>{ planMap[x.plan||'trial']=(planMap[x.plan||'trial']||0)+1; });
    setByPlan(Object.entries(planMap).map(([plan,count])=>({plan,count})).sort((a,b)=>b.count-a.count));
    // Monthly signups
    const year = now.getFullYear();
    const mon = MONTHS.map((m,mi) => {
      const pad = String(mi+1).padStart(2,'0');
      return { month: m, tenants: t.filter(x=>x.created_at?.startsWith(`${year}-${pad}`)).length };
    });
    setMonthly(mon);
    setTotals({ total: t.length, active: active.length, trial: trial.length, paid: paid.length });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-5 h-5 text-primary"/><h1 className="text-xl font-bold text-foreground">Revenue & Subscription Overview</h1></div>
      {loading ? <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl"/>)}</div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{l:'Total Tenants',v:totals.total,icon:Users,c:'text-primary'},{l:'Active',v:totals.active,icon:TrendingUp,c:'text-green-700'},{l:'On Trial',v:totals.trial,icon:Crown,c:'text-orange-600'},{l:'Paid',v:totals.paid,icon:DollarSign,c:'text-purple-700'}].map(s=>(
              <Card key={s.l} style={CARD} className="rounded-2xl">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground font-medium">{s.l}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${s.c}`}>{s.v}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card style={CARD}>
            <CardHeader className="pb-1"><CardTitle className="text-base text-foreground">Monthly New Signups ({new Date().getFullYear()})</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthly} margin={{top:4,right:8,bottom:0,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                  <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} width={30} allowDecimals={false}/>
                  <Tooltip contentStyle={TT}/>
                  <Bar dataKey="tenants" fill="#2563EB" radius={[4,4,0,0]} name="New Tenants"/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card style={CARD}>
            <CardHeader className="pb-1"><CardTitle className="text-base text-foreground">Tenants by Plan</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead><tr className="border-b border-border"><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Plan</th><th className="text-right py-2 px-3 font-semibold text-muted-foreground">Tenants</th><th className="text-right py-2 px-3 font-semibold text-muted-foreground">Share</th></tr></thead>
                <tbody>{byPlan.map(p=>(
                  <tr key={p.plan} className="border-b border-border hover:bg-card">
                    <td className="py-2 px-3 font-medium text-foreground capitalize">{p.plan}</td>
                    <td className="py-2 px-3 text-right font-bold text-primary">{p.count}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{totals.total>0?(p.count/totals.total*100).toFixed(1):'0'}%</td>
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
