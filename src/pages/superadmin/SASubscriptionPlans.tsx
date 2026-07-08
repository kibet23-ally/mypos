import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import { CreditCard, Plus, Edit2, Trash2, CheckCircle, Users, Package, Star } from 'lucide-react';

interface Plan {
  id: string; name: string; price: number; currency: string; interval: string;
  max_users: number; max_products: number; features: string[];
  description?: string; is_active: boolean; is_popular?: boolean;
}

const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inp = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';
const INTERVALS = ['month','year','lifetime'];
const CURRENCIES = ['KES','USD','EUR','GBP','NGN','ZAR','GHS','TZS','UGX'];
const EMPTY = { name:'', price:'', currency:'KES', interval:'month', max_users:'5', max_products:'500', features:'', description:'', is_active:true, is_popular:false };

export default function SASubscriptionPlans() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<typeof EMPTY & { is_active: boolean; is_popular: boolean }>(EMPTY as typeof EMPTY & { is_active: boolean; is_popular: boolean });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('subscription_plans').select('*').order('price');
    setPlans((data ?? []) as Plan[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY as typeof EMPTY & { is_active: boolean; is_popular: boolean }); setOpen(true); };
  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({ name:p.name, price:String(p.price), currency:p.currency, interval:p.interval,
      max_users:String(p.max_users), max_products:String(p.max_products),
      features: Array.isArray(p.features)?p.features.join('\n'):'',
      description: p.description??'', is_active:p.is_active, is_popular:p.is_popular??false });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { toast.error('Valid price required'); return; }
    setSaving(true);
    const featArr = form.features.split('\n').map(f=>f.trim()).filter(Boolean);
    const payload = { name: form.name, price, currency: form.currency, interval: form.interval,
      max_users: parseInt(form.max_users)||5, max_products: parseInt(form.max_products)||500,
      features: featArr, description: form.description||null, is_active: form.is_active, is_popular: form.is_popular };
    const { error } = editing
      ? await supabase.from('subscription_plans').update(payload).eq('id', editing.id)
      : await supabase.from('subscription_plans').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Plan updated' : 'Plan created');
    setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this plan? Tenants on this plan will not be affected immediately.')) return;
    await supabase.from('subscription_plans').delete().eq('id', id);
    toast.success('Plan deleted'); load();
  };

  const tf = (f: string, v: string | boolean) => setForm(prev => ({ ...prev, [f]: v }));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Subscription Plans</h1>
          <Badge variant="secondary">{plans.length}</Badge>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:opacity-90 text-white h-9 gap-1"><Plus className="w-4 h-4"/>New Plan</Button>
      </div>

      {loading ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-52 bg-secondary rounded-2xl animate-pulse"/>)}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(p => {
            const features = Array.isArray(p.features) ? p.features : [];
            return (
              <Card key={p.id} style={CARD} className={`rounded-2xl relative ${p.is_popular?'border-primary ring-2 ring-primary':''} ${!p.is_active?'opacity-60':''}`}>
                {p.is_popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full flex items-center gap-1"><Star className="w-3 h-3"/>Popular</span></div>}
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-foreground text-lg">{p.name}</h3>
                    {!p.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  <p className="text-3xl font-bold text-primary mb-0.5">{p.currency} {p.price.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/{p.interval}</span></p>
                  {p.description && <p className="text-xs text-muted-foreground mb-2">{p.description}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3"/>{p.max_users} users</span>
                    <span className="flex items-center gap-1"><Package className="w-3 h-3"/>{p.max_products?p.max_products+' products':'Unlimited'}</span>
                  </div>
                  <ul className="space-y-1 mb-4">
                    {features.map((f,i)=><li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle className="w-3 h-3 text-green-500 shrink-0"/>{f}</li>)}
                  </ul>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={()=>openEdit(p)} className="flex-1 gap-1"><Edit2 className="w-3 h-3"/>Edit</Button>
                    <Button variant="outline" size="sm" onClick={()=>del(p.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?'Edit Plan':'New Subscription Plan'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Plan Name</Label><Input className={inp} value={form.name} onChange={e=>tf('name',e.target.value)} placeholder="e.g. Starter, Pro, Enterprise"/></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Price</Label><Input type="number" min="0" step="0.01" className={inp} value={form.price} onChange={e=>tf('price',e.target.value)}/></div>
              <div><Label>Currency</Label>
                <select className={`w-full ${inp}`} value={form.currency} onChange={e=>tf('currency',e.target.value)}>
                  {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><Label>Interval</Label>
                <select className={`w-full ${inp}`} value={form.interval} onChange={e=>tf('interval',e.target.value)}>
                  {INTERVALS.map(i=><option key={i} value={i} className="capitalize">{i}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Max Users</Label><Input type="number" min="1" className={inp} value={form.max_users} onChange={e=>tf('max_users',e.target.value)}/></div>
              <div><Label>Max Products</Label><Input type="number" min="0" className={inp} value={form.max_products} onChange={e=>tf('max_products',e.target.value)} placeholder="0 = unlimited"/></div>
            </div>
            <div><Label>Description (optional)</Label><Input className={inp} value={form.description} onChange={e=>tf('description',e.target.value)} placeholder="One-line plan summary"/></div>
            <div><Label>Features (one per line)</Label><Textarea className="bg-card border-border rounded-xl" rows={4} value={form.features} onChange={e=>tf('features',e.target.value)} placeholder="Inventory management&#10;Multi-user access&#10;Reports &amp; analytics"/></div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v=>tf('is_active',v)}/><Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_popular} onCheckedChange={v=>tf('is_popular',v)}/><Label>Mark as Popular</Label></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button className="bg-primary hover:opacity-90 text-white" onClick={save} disabled={saving}>{saving?'Saving…':editing?'Update Plan':'Create Plan'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
