<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Store, Receipt, Bell, DollarSign, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import {
  SUPPORTED_CURRENCIES, getCurrencyByCode, formatCurrency,
} from '@/lib/currency';

export default function OWSettings() {
  const { appUser, refreshUser } = useAuth();

  // ── Business profile ──────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState(appUser?.tenant?.business_name ?? '');
  const [phone,        setPhone]        = useState('');
  const [address,      setAddress]      = useState('');
  const [taxRate,      setTaxRate]      = useState('16'); // Kenya VAT default
  const [receiptFooter, setReceiptFooter] = useState('Thank you for your business!');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Currency ──────────────────────────────────────────────────────────────
  const [currencyCode,   setCurrencyCode]   = useState(appUser?.currency_code   ?? 'KES');
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Sync from appUser when it loads
  useEffect(() => {
    if (appUser) {
      setBusinessName(appUser.tenant?.business_name ?? '');
      setCurrencyCode(appUser.currency_code ?? 'KES');
    }
  }, [appUser]);

  const selectedCurrency = getCurrencyByCode(currencyCode);

  // ── Save profile ──────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!appUser?.tenant_id) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('tenants')
      .update({ business_name: businessName.trim() })
      .eq('id', appUser.tenant_id);
    setSavingProfile(false);
    if (error) { toast.error('Failed to save profile'); return; }
    toast.success('Business profile saved');
    await refreshUser();
  };

  // ── Save currency ─────────────────────────────────────────────────────────
  const saveCurrency = async () => {
    if (!appUser?.tenant_id) return;
    const curr = getCurrencyByCode(currencyCode);
    setSavingCurrency(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        currency_code:   curr.code,
        currency_symbol: curr.symbol,
        currency_name:   curr.name,
      })
      .eq('id', appUser.tenant_id);
    setSavingCurrency(false);
    if (error) { toast.error('Failed to save currency'); return; }
    toast.success(`Currency updated to ${curr.name} (${curr.symbol})`);
    await refreshUser();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure your business profile and preferences</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ── Business profile ── */}
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-balance">
              <Store className="w-4 h-4" /> Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Business Name</Label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)} className="px-3 h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Phone Number</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 700 000 000" className="px-3 h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Business Address</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Nairobi, Kenya" className="px-3 h-9" />
            </div>
            <Button className="w-full h-9 font-medium gap-2" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* ── Currency ── */}
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-balance">
              <DollarSign className="w-4 h-4" /> Currency Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current currency info */}
            <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/20">
              <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-foreground">{selectedCurrency.symbol}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{selectedCurrency.name}</p>
                <p className="text-xs text-muted-foreground">{selectedCurrency.code} · Preview: {formatCurrency(1500, selectedCurrency.code)}</p>
              </div>
              {currencyCode === (appUser?.currency_code ?? 'KES') && (
                <Badge variant="secondary" className="ml-auto shrink-0 gap-1 text-xs">
                  <Check className="w-3 h-3" /> Active
                </Badge>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Select Currency</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger className="h-9 px-3">
                  <SelectValue placeholder="Choose currency" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{c.symbol}</span>
                      {c.name}
                      <span className="ml-2 text-xs text-muted-foreground">({c.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Live preview */}
            <div className="p-3 rounded border border-border bg-muted/10 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Price preview</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatCurrency(1200, currencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax 16%</span>
                <span className="font-semibold">{formatCurrency(192, currencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(1392, currencyCode)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-pretty">
              Changing currency updates all prices, receipts, and reports across your business.
            </p>

            <Button
              className="w-full h-9 font-medium gap-2"
              onClick={saveCurrency}
              disabled={savingCurrency || currencyCode === (appUser?.currency_code ?? 'KES')}
            >
              {savingCurrency ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {currencyCode === (appUser?.currency_code ?? 'KES') ? 'Currency Saved' : 'Save Currency'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── POS / receipt settings ── */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-balance">
            <Receipt className="w-4 h-4" /> POS & Receipt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Tax Rate (%)</Label>
              <Input value={taxRate} onChange={e => setTaxRate(e.target.value)} className="px-3 h-9" type="number" min="0" max="100" step="0.1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Receipt Footer Message</Label>
              <Input value={receiptFooter} onChange={e => setReceiptFooter(e.target.value)} className="px-3 h-9" />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            {[
              { label: 'Auto-print Receipt', desc: 'Automatically print after each sale', enabled: false },
              { label: 'Low Stock Alerts', desc: 'Notify when stock falls below reorder point', enabled: true },
            ].map(n => (
              <div key={n.label} className="flex items-center justify-between p-3 rounded border border-border bg-muted/10">
                <div>
                  <p className="text-sm font-medium text-foreground">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <div className={`w-2 h-2 rounded-full shrink-0 ${n.enabled ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'}`} />
              </div>
            ))}
          </div>
          <Button className="w-full h-9 font-medium gap-2" onClick={() => toast.success('POS settings saved')}>
            <Save className="w-4 h-4" /> Save POS Settings
          </Button>
        </CardContent>
      </Card>

      {/* ── Notifications ── */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-balance">
            <Bell className="w-4 h-4" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Daily Sales Summary', desc: 'Receive an end-of-day sales report', enabled: true },
              { label: 'Staff Clock In/Out', desc: 'Alert when staff starts or ends their shift', enabled: false },
              { label: 'Out-of-Stock Alert', desc: 'Immediate alert when a product runs out', enabled: true },
            ].map(n => (
              <div key={n.label} className="flex items-start justify-between p-3 rounded border border-border bg-muted/10 gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{n.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{n.desc}</p>
                </div>
                <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${n.enabled ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
    </div>
  );
}
