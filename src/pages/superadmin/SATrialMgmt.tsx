import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Clock, Shield, Zap, AlertTriangle, CheckCircle, Search, RefreshCw } from 'lucide-react';

interface Tenant { id: string; business_name: string; plan: string; plan_expires_at?: string; suspended: boolean; created_at: string; email?: string; }
const PAGE = 20;
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inp = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';
function daysLeft(exp?: string) { if (!exp) return null; return Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000); }

export default function SATrialMgmt() {
  const { appUser } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'trial'|'expiring'|'expired'>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('tenants').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.ilike('business_name', `%${search}%`);
    if (filter === 'trial') q = q.eq('plan', 'trial');
    if (filter === 'expiring') q = q.lte('plan_expires_at', new Date(Date.now() + 7 * 86400000).toISOString()).gte('plan_expires_at', new Date().toISOString());
    if (filter === 'expired') q = q.lt('plan_expires_at', new Date().toISOString());
    const { data, count, error } = await q;
    if (!error) { setTenants((data ?? []) as Tenant[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);

  const activateTrial = async (t: Tenant) => {
    if (t.plan !== 'trial' && t.plan_expires_at) { toast.error('This business already had an active subscription'); return; }
    const expiry = new Date(Date.now() + 14 * 86400000).toISOString();
    const { error } = await supabase.from('tenants').update({ plan: 'trial', plan_expires_at: expiry, suspended: false, updated_at: new Date().toISOString() }).eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from('audit_logs').insert({ user_id: appUser?.id, action: 'activate_trial', table_name: 'tenants', record_id: t.id, new_values: { plan: 'trial', expires: expiry } });
    toast.success(`14-day trial activated for ${t.business_name}`); load();
  };

  const extendTrial = async (t: Tenant) => {
    const current = t.plan_expires_at ? new Date(t.plan_expires_at) : new Date();
    const extended = new Date(Math.max(current.getTime(), Date.now()) + 7 * 86400000).toISOString();
    const { error } = await supabase.from('tenants').update({ plan_expires_at: extended, updated_at: new Date().toISOString() }).eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from('audit_logs').insert({ user_id: appUser?.id, action: 'extend_trial', table_name: 'tenants', record_id: t.id, new_values: { new_expiry: extended } });
    toast.success(`Trial extended by 7 days for ${t.business_name}`); load();
  };

  const expireTrial = async (t: Tenant) => {
    if (!confirm('Expire trial for ' + t.business_name + '?')) return;
    const { error } = await supabase.from('tenants').update({ plan_expires_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from('audit_logs').insert({ user_id: appUser?.id, action: 'expire_trial', table_name: 'tenants', record_id: t.id });
    toast.success('Trial expired'); load();
  };

  const trialBadge = (t: Tenant) => {
    const d = daysLeft(t.plan_expires_at);
    if (t.suspended) return <Badge variant="destructive">Suspended</Badge>;
    if (t.plan !== 'trial') return <Badge className="bg-accent text-primary border-primary">{t.plan}</Badge>;
    if (d === null) return <Badge variant="secondary">No Trial</Badge>;
    if (d < 0) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3"/>Expired ({Math.abs(d)}d ago)</Badge>;
    if (d <= 3) return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><AlertTriangle className="w-3 h-3"/>Expiring ({d}d)</Badge>;
    if (d <= 7) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1"><Clock className="w-3 h-3"/>Trial ({d}d left)</Badge>;
    return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle className="w-3 h-3"/>Trial ({d}d left)</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">14-Day Free Trial Management</h1>
        <Badge variant="secondary">{total}</Badge>
      </div>
      <div className="flex gap-2 flex-wrap">
        {(['all','trial','expiring','expired'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(0); }}
            className={`px-4 py-2 rounded-xl border text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-card'}`}>
            {f === 'expiring' ? 'Expiring Soon (≤7d)' : f}
          </button>
        ))}
      </div>
      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className={`${inp} pl-9`} placeholder="Search business…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><Shield className="w-8 h-8 mx-auto mb-2 opacity-40"/><p>No tenants match filter.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-border">
                {['Business','Email','Plan','Expires','Status','Actions'].map(h=>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                )}
              </tr></thead>
              <tbody>{tenants.map(t => (
                <tr key={t.id} className="border-b border-border hover:bg-card">
                  <td className="py-2 px-3 font-medium text-foreground">{t.business_name}</td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">{t.email||'—'}</td>
                  <td className="py-2 px-3 capitalize font-medium text-muted-foreground">{t.plan||'trial'}</td>
                  <td className="py-2 px-3 text-muted-foreground">{t.plan_expires_at ? new Date(t.plan_expires_at).toLocaleDateString() : '—'}</td>
                  <td className="py-2 px-3">{trialBadge(t)}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      {!t.plan_expires_at && <button onClick={() => activateTrial(t)} className="p-1 hover:bg-green-50 rounded text-green-600" title="Activate 14-day trial"><Zap className="w-4 h-4"/></button>}
                      {t.plan === 'trial' && !t.suspended && <button onClick={() => extendTrial(t)} className="p-1 hover:bg-accent rounded text-primary" title="Extend 7 days"><RefreshCw className="w-4 h-4"/></button>}
                      {t.plan === 'trial' && daysLeft(t.plan_expires_at) !== null && daysLeft(t.plan_expires_at)! > 0 && (
                        <button onClick={() => expireTrial(t)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Expire trial now"><AlertTriangle className="w-4 h-4"/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {total > PAGE && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Showing {page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</Button>
                <Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}>›</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card style={CARD}>
        <CardContent className="pt-4 pb-3 text-sm text-muted-foreground space-y-1">
          <p><b>Anti-abuse:</b> Each business is eligible for one 14-day trial. Paid subscriptions required for renewals.</p>
          <p><b>Restrictions after expiry:</b> Read-only access until upgraded.</p>
          <p><b>Auto reminders:</b> Sent at 7, 3, and 1 days before expiry.</p>
        </CardContent>
      </Card>
    </div>
  );
}
