import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Shield } from 'lucide-react';
interface AuditLog { id: string; user_id?: string; action: string; table_name?: string; record_id?: string; old_values?: Record<string,unknown>; new_values?: Record<string,unknown>; created_at: string; }
const PAGE = 25; const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
export default function SAAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [page, setPage] = useState(0); const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`action.ilike.%${search}%,table_name.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setLogs((data ?? []) as AuditLog[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [page, search]);
  useEffect(() => { load(); }, [load]);
  const ACTION_COLORS: Record<string,string> = { insert:'bg-green-100 text-green-700', update:'bg-blue-100 text-blue-700', delete:'bg-red-100 text-red-700', suspend_tenant:'bg-orange-100 text-orange-700', activate_trial:'bg-purple-100 text-purple-700' };
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-blue-600"/><h1 className="text-xl font-bold text-slate-800">Audit Logs</h1><Badge variant="secondary">{total}</Badge></div>
      <Card style={CARD}>
        <CardHeader className="pb-2"><div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><Input className={`${inp} pl-9`} placeholder="Filter by action or table…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></div></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="space-y-2">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
          : logs.length===0 ? <p className="text-center py-8 text-slate-400">No audit logs found.</p>
          : <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">{['Time','Action','Table','Record ID'].map(h=><th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>)}</tr></thead>
              <tbody>{logs.map(l=>(
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5 px-3 text-slate-500 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="py-1.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[l.action]||'bg-slate-100 text-slate-600'}`}>{l.action}</span></td>
                  <td className="py-1.5 px-3 text-slate-500">{l.table_name||'—'}</td>
                  <td className="py-1.5 px-3 text-slate-400 font-mono text-xs">{l.record_id?.slice(0,8)||'—'}</td>
                </tr>
              ))}</tbody>
            </table>}
          {total > PAGE && <div className="flex items-center justify-between mt-4 text-sm text-slate-500"><span>{page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total}</span><div className="flex gap-1"><Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</Button><Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}>›</Button></div></div>}
        </CardContent>
      </Card>
    </div>
  );
}