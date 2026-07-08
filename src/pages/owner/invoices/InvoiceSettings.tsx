import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings2, Save } from 'lucide-react';
import { fetchInvoiceSettings, upsertInvoiceSettings } from '@/services/invoiceService';
import type { InvoiceSettings as InvoiceSettingsData, StockDeductionMode } from '@/types/invoice';

const CARD_STYLE = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inputClass = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';

const STOCK_MODES: { value: StockDeductionMode; label: string; desc: string }[] = [
  { value: 'immediately', label: 'Deduct immediately', desc: 'Stock is deducted as soon as invoice is issued' },
  { value: 'on_create', label: 'Reserve on create', desc: 'Stock is reserved when invoice is created (draft)' },
  { value: 'on_full_payment', label: 'Deduct on full payment', desc: 'Stock deducted only after invoice is fully paid' },
];

interface Props { tenantId: string; }

export default function InvoiceSettings({ tenantId }: Props) {
  const [settings, setSettings] = useState<Partial<InvoiceSettingsData>>({
    stock_deduction_mode: 'immediately',
    default_tax_rate: 0.16,
    default_payment_terms: 'Payment due within 30 days',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoiceSettings(tenantId).then(s => {
      if (s) setSettings(s);
      setLoading(false);
    });
  }, [tenantId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertInvoiceSettings(tenantId, settings);
      toast.success('Invoice settings saved');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" /> Invoice Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-5">
          {/* Tax Rate */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default Tax Rate (%)</Label>
            <Input type="number" min="0" max="100" step="0.1"
              value={((settings.default_tax_rate ?? 0.16) * 100).toFixed(1)}
              onChange={e => setSettings((s: Partial<InvoiceSettingsData>) => ({ ...s, default_tax_rate: (parseFloat(e.target.value) || 0) / 100 }))}
              className={inputClass} placeholder="16.0" />
            <p className="text-xs text-muted-foreground mt-1">Kenya VAT default is 16%</p>
          </div>

          {/* Payment Terms */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default Payment Terms</Label>
            <Input value={settings.default_payment_terms ?? ''}
              onChange={e => setSettings((s: Partial<InvoiceSettingsData>) => ({ ...s, default_payment_terms: e.target.value }))}
              className={inputClass} placeholder="Payment due within 30 days" />
          </div>

          {/* Stock deduction */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Stock Deduction Mode</Label>
            <div className="space-y-2">
              {STOCK_MODES.map(m => (
                <label key={m.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${settings.stock_deduction_mode === m.value ? 'border-primary bg-accent' : 'border-border hover:bg-card'}`}>
                  <input type="radio" name="stock_mode" value={m.value}
                    checked={settings.stock_deduction_mode === m.value}
                    onChange={() => setSettings((s: Partial<InvoiceSettingsData>) => ({ ...s, stock_deduction_mode: m.value }))}
                    className="mt-1 accent-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || loading}
            className="w-full h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity"
            style={{ background: 'hsl(var(--primary))' }}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </CardContent>
      </Card>

      {/* Notification stubs */}
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-foreground">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          <p className="text-xs text-muted-foreground">Configure invoice notification channels. Coming soon:</p>
          <div className="grid grid-cols-2 gap-2">
            {['Email invoices', 'WhatsApp sharing', 'SMS reminders', 'Overdue alerts', 'Payment confirmations'].map(n => (
              <div key={n} className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border opacity-60">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-xs text-muted-foreground">{n}</span>
                <span className="ml-auto text-xs text-muted-foreground font-medium">Soon</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
