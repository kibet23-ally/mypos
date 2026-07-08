import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BadgeDollarSign, Plus, Edit2, Trash2, CheckCircle } from 'lucide-react';

interface TaxRate { id: string; name: string; rate: number; is_default: boolean; applies_to: string; is_active: boolean; }
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inp = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';
const EMPTY = { name: '', rate: '', applies_to: 'all', is_default: false, is_active: true };
const APPLIES_TO = ['all','products','services'];

export default function OWTaxSettings() {
  const { appUser, refreshUser } = useAuth();
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState<typeof EMPTY & { is_default: boolean; is_active: boolean }>(EMPTY as typeof EMPTY & { is_default: boolean; is_active: boolean });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    const { data, error } = await supabase.from('tax_rates').select('*').eq('tenant_id', appUser.tenant_id).order('is_default', { ascending: false });
    if (!error) setRates((data ?? []) as TaxRate[]);
    setLoading(false);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY as typeof EMPTY & { is_default: boolean; is_active: boolean }); setOpen(true); };
  const openEdit = (r: TaxRate) => { setEditing(r); setForm({ name: r.name, rate: String(r.rate), applies_to: r.applies_to, is_default: r.is_default, is_active: r.is_active }); setOpen(true); };

  const save = async () => {
    if (!appUser?.tenant_id) return;
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const rate = parseFloat(form.rate);
    if (isNaN(rate) || rate < 0 || rate > 100) { toast.error('Rate must be 0–100'); return; }
    setSaving(true);
    // If setting default, clear others first
    if (form.is_default) await supabase.from('tax_rates').update({ is_default: false }).eq('tenant_id', appUser.tenant_id);
    const payload = { tenant_id: appUser.tenant_id, name: form.name, rate, applies_to: form.applies_to, is_default: form.is_default, is_active: form.is_active };
    const { error } = editing
      ? await supabase.from('tax_rates').update(payload).eq('id', editing.id)
      : await supabase.from('tax_rates').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    // Update tenant's global tax_rate if this is the default
    if (form.is_default) {
      await supabase.from('tenants').update({ tax_rate: rate, updated_at: new Date().toISOString() }).eq('id', appUser.tenant_id);
      await refreshUser?.();
    }
    toast.success(editing ? 'Tax rate updated' : 'Tax rate added');
    setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this tax rate?')) return;
    await supabase.from('tax_rates').delete().eq('id', id);
    toast.success('Deleted'); load();
  };

  const setDefault = async (r: TaxRate) => {
    if (!appUser?.tenant_id) return;
    await supabase.from('tax_rates').update({ is_default: false }).eq('tenant_id', appUser.tenant_id);
    await supabase.from('tax_rates').update({ is_default: true }).eq('id', r.id);
    await supabase.from('tenants').update({ tax_rate: r.rate, updated_at: new Date().toISOString() }).eq('id', appUser.tenant_id);
    await refreshUser?.();
    toast.success(`${r.name} set as default (${r.rate}%)`);
    load();
  };

  const toggle = async (r: TaxRate) => {
    await supabase.from('tax_rates').update({ is_active: !r.is_active }).eq('id', r.id);
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Tax Settings</h1>
        </div>
        {appUser?.role === 'owner' && <Button onClick={openCreate} className="bg-primary hover:opacity-90 text-white h-9 gap-1"><Plus className="w-4 h-4" />Add Tax Rate</Button>}
      </div>

      {/* Current default */}
      <Card style={CARD} className="border-primary bg-accent rounded-2xl">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-primary font-medium uppercase tracking-wide">Active Default Tax Rate</p>
          <p className="text-2xl font-bold text-primary mt-0.5">{appUser?.tenant?.tax_rate ?? 0}%</p>
          <p className="text-xs text-primary mt-1">Applied automatically to all transactions. Change by setting a different rate as default.</p>
        </CardContent>
      </Card>

      <Card style={CARD}>
        <CardHeader className="pb-2"><CardTitle className="text-base text-foreground">Tax Rates</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading…</div> : rates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><BadgeDollarSign className="w-8 h-8 mx-auto mb-2 opacity-40"/><p>No tax rates configured.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-border">
                {['Name','Rate','Applies To','Default','Status','Actions'].map(h=>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                )}
              </tr></thead>
              <tbody>{rates.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-card">
                  <td className="py-2 px-3 font-medium text-foreground">{r.name}</td>
                  <td className="py-2 px-3 font-bold text-primary">{r.rate}%</td>
                  <td className="py-2 px-3 capitalize text-muted-foreground">{r.applies_to}</td>
                  <td className="py-2 px-3">
                    {r.is_default
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" />Default</span>
                      : appUser?.role === 'owner' && <button onClick={() => setDefault(r)} className="text-xs text-primary hover:underline">Set as Default</button>
                    }
                  </td>
                  <td className="py-2 px-3">
                    <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} disabled={appUser?.role !== 'owner'} />
                  </td>
                  <td className="py-2 px-3">
                    {appUser?.role === 'owner' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1 hover:bg-secondary rounded text-muted-foreground"><Edit2 className="w-4 h-4"/></button>
                        {!r.is_default && <button onClick={() => del(r.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-4 h-4"/></button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Inclusive/Exclusive info */}
      <Card style={CARD}>
        <CardHeader className="pb-2"><CardTitle className="text-base text-foreground">Tax Mode</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Configure whether prices include or exclude tax in the <span className="font-medium text-primary">Receipt Settings</span> page (Tax Inclusive toggle).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="font-medium text-foreground text-sm">Tax Exclusive (default)</p>
              <p className="text-xs text-muted-foreground mt-1">Price = base price. Tax added on top at checkout. E.g. item KES 100 + 16% VAT = KES 116</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="font-medium text-foreground text-sm">Tax Inclusive</p>
              <p className="text-xs text-muted-foreground mt-1">Price already includes tax. E.g. item KES 116 includes 16% VAT (base KES 100)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Tax Rate' : 'Add Tax Rate'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name</Label><Input className={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. VAT, GST, Sales Tax"/></div>
            <div><Label>Rate (%)</Label><Input type="number" min="0" max="100" step="0.1" className={inp} value={form.rate} onChange={e=>setForm(f=>({...f,rate:e.target.value}))}/></div>
            <div><Label>Applies To</Label>
              <select className={`w-full ${inp}`} value={form.applies_to} onChange={e=>setForm(f=>({...f,applies_to:e.target.value}))}>
                {APPLIES_TO.map(a=><option key={a} value={a} className="capitalize">{a}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 py-1">
              <Switch id="is_default" checked={form.is_default} onCheckedChange={v=>setForm(f=>({...f,is_default:v}))} />
              <Label htmlFor="is_default" className="cursor-pointer">Set as Default Tax Rate</Label>
            </div>
            <div className="flex items-center gap-3 py-1">
              <Switch id="is_active" checked={form.is_active} onCheckedChange={v=>setForm(f=>({...f,is_active:v}))} />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button className="bg-primary hover:opacity-90 text-white" onClick={save} disabled={saving}>{saving?'Saving…':editing?'Update':'Add'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
