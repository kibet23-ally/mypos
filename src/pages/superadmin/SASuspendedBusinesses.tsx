import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, AlertCircle, CheckCircle } from 'lucide-react';
interface Tenant { id: string; business_name: string; plan: string; email?: string; suspension_reason?: string; created_at: string; }
const PAGE = 20; const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inp = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';
export default function SASuspendedBusinesses() {
  const [tenants, setTenants] = useState<Tenant[]>([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [page, setPage] = useState(0); const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('tenants').select('id,business_name,plan,email,suspension_reason,created_at', { count: 'exact' })
      .eq('suspended', true).order('created_at', { ascending: false }).range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.ilike('business_name', `%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setTenants((data ?? []) as Tenant[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [page, search]);
  useEffect(() => { load(); }, [load]);
  const unsuspend = async (id: string) => {
    await supabase.from('tenants').update({ suspended: false, suspension_reason: null, updated_at: new Date().toISOString() }).eq('id', id);
    toast.success('Business unsuspended'); load();
  };
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-5 h-5 text-red-500"/><h1 className="text-xl font-bold text-foreground">Suspended Businesses</h1><Badge variant="destructive">{total}</Badge></div>
      <Card style={CARD}>
        <CardHeader className="pb-2"><div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/><Input className={`${inp} pl-9`} placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></div></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-11 w-full"/>)}</div>
          : tenants.length===0 ? <p className="text-center py-8 text-muted-foreground">No suspended businesses.</p>
          : <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-border">{['Business','Email','Reason','Actions'].map(h=><th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>{tenants.map(t=>(
                <tr key={t.id} className="border-b border-border hover:bg-red-50">
                  <td className="py-2 px-3 font-medium text-foreground">{t.business_name}</td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{t.email||'—'}</td>
                  <td className="py-2 px-3 text-red-500 text-xs max-w-[200px] truncate">{t.suspension_reason||'—'}</td>
                  <td className="py-2 px-3"><button onClick={()=>unsuspend(t.id)} className="flex items-center gap-1 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-lg"><CheckCircle className="w-3 h-3"/>Unsuspend</button></td>
                </tr>
              ))}</tbody>
            </table>}
          {total > PAGE && <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground"><span>{page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total}</span><div className="flex gap-1"><Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</Button><Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}>›</Button></div></div>}
        </CardContent>
      </Card>
    </div>
  );
}
