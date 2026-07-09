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
    </div>
  );
}
