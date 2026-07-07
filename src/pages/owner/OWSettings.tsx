import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Building2, CreditCard, Bell, Shield } from 'lucide-react';
import { CURRENCY_OPTIONS } from '@/lib/currency';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const inputClass = "h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3";

export default function OWSettings() {
  const { appUser, refreshUser } = useAuth();
  const tenant = appUser?.tenant;
  const [biz, setBiz] = useState(tenant?.business_name || '');
  const [taxRate, setTaxRate] = useState(String(tenant?.tax_rate ?? '8.5'));
  const [currency, setCurrency] = useState(tenant?.currency || 'KES');
  const [saving, setSaving] = useState(false);
  const [receipts, setReceipts] = useState(true);

  const save = async () => {
    if (!appUser?.tenant_id) return;
    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        business_name: biz,
        currency,
        tax_rate: parseFloat(taxRate) || 8.5,
      })
      .eq('id', appUser.tenant_id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      await refreshUser();
      toast.success('Settings saved');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 text-balance">Business Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your business configuration</p>
        </div>
        <button onClick={save} disabled={saving}
          className="h-10 px-5 rounded-xl text-sm font-semibold text-slate-900 disabled:opacity-60 transition-opacity hover:opacity-90"
          style={{ background: '#2563EB' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 text-balance">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: '#EFF6FF', border: '1px solid rgba(37,99,235,0.3)' }}>
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
              </div>
              Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Business Name</Label>
              <Input value={biz} onChange={e => setBiz(e.target.value)} className={inputClass} placeholder="My Business" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Currency</Label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 px-3 text-sm focus:outline-none focus:border-[#2563EB]">
                {CURRENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Tax Rate (%)</Label>
              <Input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} className={inputClass} placeholder="8.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 text-balance">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Bell className="w-3.5 h-3.5 text-[#fbbf24]" />
              </div>
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-1">
            {[
              { label: 'Print Receipts', desc: 'Auto-print after every sale', state: receipts, setState: setReceipts },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <Switch checked={item.state} onCheckedChange={item.setState} />
              </div>
            ))}
            {[
              { label: 'Low Stock Alerts', desc: 'Alert when items below threshold' },
              { label: 'Daily Sales Report', desc: 'Email summary at end of day' },
              { label: 'New Cashier Notifications', desc: 'Notify when a cashier logs in' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 text-balance">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="rounded-xl p-4 border mb-4"
              style={{ background: 'rgba(37,99,235,0.1)', borderColor: 'rgba(37,99,235,0.25)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">Professional Plan</span>
                <span className="text-xs font-bold text-blue-500">$99/mo</span>
              </div>
              <p className="text-xs text-slate-400">Renews on July 15, 2026</p>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 h-9 rounded-xl text-xs font-semibold text-white border border-slate-200 hover:bg-slate-50 transition-colors">
                View Invoices
              </button>
              <button className="flex-1 h-9 rounded-xl text-xs font-semibold text-slate-900"
                style={{ background: '#2563EB' }}>
                Upgrade Plan
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border h-full" style={CARD_STYLE}>
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 text-balance">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                <Shield className="w-3.5 h-3.5 text-blue-500" />
              </div>
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-1">
            {[
              { label: 'Two-Factor Authentication', desc: 'Add extra layer of security', checked: false },
              { label: 'Session Timeout', desc: 'Auto-logout after 60 minutes', checked: true },
              { label: 'Login Notifications', desc: 'Email on new device sign-in', checked: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.checked} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
