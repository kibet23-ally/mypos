import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users } from 'lucide-react';
interface User { id: string; full_name: string; email: string; role: string; tenant_id?: string; created_at: string; }
const PAGE = 25; const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const ROLE_COLORS: Record<string,string> = { superadmin:'bg-red-100 text-red-700', owner:'bg-blue-100 text-blue-700', manager:'bg-purple-100 text-purple-700', cashier:'bg-green-100 text-green-700' };
export default function SASystemUsers() {
  const [users, setUsers] = useState<User[]>([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [page, setPage] = useState(0); const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('users').select('id,full_name,email,role,tenant_id,created_at', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setUsers((data ?? []) as User[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [page, search]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-blue-600"/><h1 className="text-xl font-bold text-slate-800">System Users</h1><Badge variant="secondary">{total}</Badge></div>
      <Card style={CARD}>
        <CardHeader className="pb-2"><div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><Input className={`${inp} pl-9`} placeholder="Search user…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></div></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
          : users.length===0 ? <p className="text-center py-8 text-slate-400">No users found.</p>
          : <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">{['Name','Email','Role','Joined'].map(h=><th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>)}</tr></thead>
              <tbody>{users.map(u=>(
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium text-slate-800">{u.full_name||'—'}</td>
                  <td className="py-2 px-3 text-slate-500 text-xs">{u.email||'—'}</td>
                  <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[u.role]||'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                  <td className="py-2 px-3 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>}
          {total > PAGE && <div className="flex justify-end gap-1 mt-4"><Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</Button><Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}>›</Button></div>}
        </CardContent>
      </Card>
    </div>
  );
}
