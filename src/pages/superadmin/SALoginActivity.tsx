import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, LogIn } from 'lucide-react';
interface Log { id: string; action: string; created_at: string; }
const PAGE = 25; const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
export default function SALoginActivity() {
  const [logs, setLogs] = useState<Log[]>([]); const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0); const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase.from('audit_logs').select('id,action,created_at', { count: 'exact' })
      .in('action',['login','logout','session_start']).order('created_at', { ascending: false }).range(page * PAGE, (page+1)*PAGE-1);
    setLogs((data??[]) as Log[]); setTotal(count??0); setLoading(false);
  }, [page]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2"><LogIn className="w-5 h-5 text-blue-600"/><h1 className="text-xl font-bold text-slate-800">Login Activity</h1><Badge variant="secondary">{total}</Badge></div>
      <Card style={CARD}>
        <CardContent className="pt-4 overflow-x-auto">
          {loading ? <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
          : logs.length===0 ? <p className="text-center py-8 text-slate-400">No login activity recorded.</p>
          : <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">{['Action','Time'].map(h=><th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>)}</tr></thead>
              <tbody>{logs.map(l=>(<tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50"><td className="py-2 px-3 font-medium text-slate-700">{l.action}</td><td className="py-2 px-3 text-slate-400 text-xs">{new Date(l.created_at).toLocaleString()}</td></tr>))}</tbody>
            </table>}
          {total > PAGE && <div className="flex justify-end gap-1 mt-4"><Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</Button><Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}>›</Button></div>}
        </CardContent>
      </Card>
    </div>
  );
}
