import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Key, Shield, Search, AlertTriangle, CheckCircle, Clock, Ban,
  ChevronLeft, ChevronRight, Zap, RefreshCw
} from 'lucide-react';

interface Tenant {
  id: string; business_name: string; plan: string; plan_expires_at?: string;
  suspended: boolean; suspension_reason?: string; created_at: string;
  email?: string; phone?: string;
}
interface Plan { id: string; name: string; price: number; interval: string; }

const PAGE = 15;
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inp = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';

function daysLeft(exp?: string) { if (!exp) return null; return Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000); }

export default function SALicenses() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [suspReason, setSuspReason] = useState('');
  const [renewForm, setRenewForm] = useState({ plan: '', days: '365' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('tenants').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.ilike('business_name', `%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setTenants((data ?? []) as Tenant[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [page, search]);

  const loadPlans = useCallback(async () => {
    const { data } = await supabase.from('subscription_plans').select('id,name,price,interval').eq('is_active', true).order('price');
    setPlans((data ?? []) as Plan[]);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPlans(); }, [loadPlans]);

  const suspend = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from('tenants').update({ suspended: true, suspension_reason: suspReason || 'Suspended by administrator', updated_at: new Date().toISOString() }).eq('id', selected.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    // Log audit
    await supabase.from('audit_logs').insert({ user_id: appUser?.id, action: 'suspend_tenant', table_name: 'tenants', record_id: selected.id, new_values: { suspended: true, reason: suspReason } });
    toast.success('Tenant suspended'); setSuspendOpen(false); load();
  };

  const unsuspend = async (t: Tenant) => {
    const { error } = await supabase.from('tenants').update({ suspended: false, suspension_reason: null, updated_at: new Date().toISOString() }).eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from('audit_logs').insert({ user_id: appUser?.id, action: 'unsuspend_tenant', table_name: 'tenants', record_id: t.id });
    toast.success('Tenant unsuspended'); load();
  };

  const renew = async () => {
    if (!selected) return;
    const newExpiry = new Date(Date.now() + parseInt(renewForm.days) * 86400000).toISOString();
    setSaving(true);
    const { error } = await supabase.from('tenants').update({ plan: renewForm.plan || selected.plan, plan_expires_at: newExpiry, suspended: false, updated_at: new Date().toISOString() }).eq('id', selected.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await supabase.from('audit_logs').insert({ user_id: appUser?.id, action: 'renew_license', table_name: 'tenants', record_id: selected.id, new_values: { plan: renewForm.plan || selected.plan, expires: newExpiry } });
    toast.success('License renewed'); setRenewOpen(false); load();
  };

  const activateTrial = async (t: Tenant) => {
    const expiry = new Date(Date.now() + 14 * 86400000).toISOString();
    const { error } = await supabase.from('tenants').update({ plan: 'trial', plan_expires_at: expiry, suspended: false, updated_at: new Date().toISOString() }).eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    toast.success('14-day trial activated'); load();
  };

  const planStatusBadge = (t: Tenant) => {
    if (t.suspended) return <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3"/>Suspended</Badge>;
    const d = daysLeft(t.plan_expires_at);
    if (d !== null && d < 0) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3"/>Expired</Badge>;
    if (d !== null && d <= 7) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1"><Clock className="w-3 h-3"/>Expiring ({d}d)</Badge>;
    return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle className="w-3 h-3"/>Active</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Key className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">SaaS Licensing Management</h1>
        <Badge variant="secondary">{total}</Badge>
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
            <div className="text-center py-10 text-muted-foreground"><Shield className="w-8 h-8 mx-auto mb-2 opacity-40"/><p>No tenants found.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-border">
                {['Business','Plan','Expires','Status','Actions'].map(h=>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                )}
              </tr></thead>
              <tbody>{tenants.map(t => (
                <tr key={t.id} className={`border-b border-border hover:bg-card ${t.suspended ? 'bg-red-50' : ''}`}>
                  <td className="py-2 px-3">
                    <p className="font-medium text-foreground">{t.business_name}</p>
                    {t.email && <p className="text-xs text-muted-foreground">{t.email}</p>}
                  </td>
                  <td className="py-2 px-3 capitalize">
                    <span className="font-medium text-primary">{t.plan || 'trial'}</span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {t.plan_expires_at ? new Date(t.plan_expires_at).toLocaleDateString() : '—'}
                    {daysLeft(t.plan_expires_at) !== null && !t.suspended && (
                      <span className={`ml-1 text-xs ${daysLeft(t.plan_expires_at)! < 0 ? 'text-red-500' : daysLeft(t.plan_expires_at)! <= 7 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                        ({daysLeft(t.plan_expires_at)!}d)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">{planStatusBadge(t)}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setSelected(t); setRenewForm({ plan: t.plan, days: '365' }); setRenewOpen(true); }}
                        className="p-1 hover:bg-accent rounded text-primary" title="Renew/Change Plan"><RefreshCw className="w-4 h-4"/></button>
                      {!t.plan_expires_at && (
                        <button onClick={() => activateTrial(t)} className="p-1 hover:bg-green-50 rounded text-green-600" title="Activate 14-day Trial"><Zap className="w-4 h-4"/></button>
                      )}
                      {t.suspended
                        ? <button onClick={() => unsuspend(t)} className="p-1 hover:bg-green-50 rounded text-green-600" title="Unsuspend"><CheckCircle className="w-4 h-4"/></button>
                        : <button onClick={() => { setSelected(t); setSuspReason(''); setSuspendOpen(true); }} className="p-1 hover:bg-red-50 rounded text-red-500" title="Suspend"><Ban className="w-4 h-4"/></button>
                      }
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
                <Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="w-4 h-4"/></Button>
                <Button variant="outline" size="sm" disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}><ChevronRight className="w-4 h-4"/></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><Ban className="w-4 h-4"/>Suspend {selected?.business_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Suspending will immediately restrict access for all users of this tenant.</p>
            <div><Label>Reason (optional)</Label><Textarea className="bg-card border-border rounded-xl mt-1" rows={3} value={suspReason} onChange={e=>setSuspReason(e.target.value)} placeholder="e.g. Non-payment, policy violation…"/></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setSuspendOpen(false)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={suspend} disabled={saving}>{saving?'Suspending…':'Suspend Account'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Renew / Change Plan — {selected?.business_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>New Plan</Label>
              <select className={`w-full ${inp}`} value={renewForm.plan} onChange={e=>setRenewForm(f=>({...f,plan:e.target.value}))}>
                <option value="trial">Trial</option>
                {plans.map(p=><option key={p.id} value={p.name.toLowerCase()}>{p.name} — {fmt(p.price)}/{p.interval}</option>)}
              </select>
            </div>
            <div><Label>Duration (days)</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {[14,30,90,180,365].map(d=>(
                  <button key={d} onClick={()=>setRenewForm(f=>({...f,days:String(d)}))}
                    className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${renewForm.days===String(d)?'bg-primary text-white border-primary':'bg-white text-muted-foreground border-border hover:bg-card'}`}>
                    {d} days
                  </button>
                ))}
              </div>
              <Input type="number" min="1" className={`${inp} mt-2`} value={renewForm.days} onChange={e=>setRenewForm(f=>({...f,days:e.target.value}))} placeholder="Custom days"/>
            </div>
            <p className="text-xs text-muted-foreground">New expiry: <b>{new Date(Date.now()+parseInt(renewForm.days||'0')*86400000).toLocaleDateString()}</b></p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setRenewOpen(false)}>Cancel</Button>
              <Button className="bg-primary hover:opacity-90 text-white" onClick={renew} disabled={saving}>{saving?'Saving…':'Renew License'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
