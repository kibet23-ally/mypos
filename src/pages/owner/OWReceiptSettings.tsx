import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import { Receipt, Eye, Monitor, Smartphone } from 'lucide-react';

const PAPER_SIZES = ['A4','A5','80mm (Thermal)','58mm (Mini)'];
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';

export default function OWReceiptSettings() {
  const { appUser, refreshUser } = useAuth();
  const { format: fmt, symbol } = useCurrency();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState({
    business_name: appUser?.tenant?.business_name ?? '',
    phone: (appUser?.tenant as Record<string,unknown>)?.phone as string ?? '',
    email: (appUser?.tenant as Record<string,unknown>)?.email as string ?? '',
    address: (appUser?.tenant as Record<string,unknown>)?.address as string ?? '',
    receipt_header: (appUser?.tenant as Record<string,unknown>)?.receipt_header as string ?? '',
    receipt_footer: (appUser?.tenant as Record<string,unknown>)?.receipt_footer as string ?? 'Thank you for shopping with us!',
    receipt_paper_size: (appUser?.tenant as Record<string,unknown>)?.receipt_paper_size as string ?? 'A4',
    show_qr_on_receipt: Boolean((appUser?.tenant as Record<string,unknown>)?.show_qr_on_receipt ?? false),
    tax_inclusive: Boolean((appUser?.tenant as Record<string,unknown>)?.tax_inclusive ?? false),
    tax_rate: String(appUser?.tenant?.tax_rate ?? '16'),
  });

  const save = async () => {
    if (!appUser?.tenant_id) return;
    setSaving(true);
    const { error } = await supabase.from('tenants').update({
      business_name: form.business_name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      receipt_header: form.receipt_header || null,
      receipt_footer: form.receipt_footer || null,
      receipt_paper_size: form.receipt_paper_size,
      show_qr_on_receipt: form.show_qr_on_receipt,
      tax_inclusive: form.tax_inclusive,
      tax_rate: parseFloat(form.tax_rate) || 0,
      updated_at: new Date().toISOString(),
    }).eq('id', appUser.tenant_id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Receipt settings saved');
    await refreshUser?.();
  };

  const tf = (field: string, val: string | boolean) => setForm(f => ({ ...f, [field]: val }));

  const PreviewCard = () => (
    <div className={`border-2 border-dashed border-slate-300 rounded-xl p-4 bg-white text-center ${form.receipt_paper_size.includes('80mm') || form.receipt_paper_size.includes('58mm') ? 'max-w-[200px]' : 'max-w-sm'} mx-auto text-xs`}>
      {form.receipt_header && <p className="text-xs text-slate-500 mb-1">{form.receipt_header}</p>}
      <h3 className="font-bold text-sm">{form.business_name || 'Business Name'}</h3>
      {form.phone && <p className="text-slate-500">{form.phone}</p>}
      {form.address && <p className="text-slate-500">{form.address}</p>}
      <div className="border-t border-dashed border-slate-300 my-2" />
      <p className="text-slate-500">Receipt #: RCT-PREVIEW</p>
      <p className="text-slate-500">Date: {new Date().toLocaleDateString()}</p>
      <div className="border-t border-dashed border-slate-300 my-2" />
      <div className="text-left space-y-0.5">
        <div className="flex justify-between"><span>Sample Product x2</span><span>{fmt(200)}</span></div>
        <div className="flex justify-between"><span>Another Item x1</span><span>{fmt(150)}</span></div>
      </div>
      <div className="border-t border-dashed border-slate-300 my-2" />
      {!form.tax_inclusive && <div className="flex justify-between text-slate-500"><span>Tax ({form.tax_rate}%)</span><span>{fmt(350 * (parseFloat(form.tax_rate)/100))}</span></div>}
      <div className="flex justify-between font-bold"><span>TOTAL</span><span>{fmt(350 + (form.tax_inclusive ? 0 : 350*(parseFloat(form.tax_rate)/100)))}</span></div>
      <div className="border-t border-dashed border-slate-300 my-2" />
      {form.show_qr_on_receipt && (
        <div className="w-12 h-12 bg-slate-200 mx-auto flex items-center justify-center rounded text-slate-400 text-[8px]">QR</div>
      )}
      {form.receipt_footer && <p className="text-slate-500 mt-2 italic">{form.receipt_footer}</p>}
      <p className="text-slate-300 mt-1">{form.receipt_paper_size}</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Receipt Settings</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreview(p => !p)} className="gap-1 h-9">
            <Eye className="w-4 h-4" />{preview ? 'Hide' : 'Preview'}
          </Button>
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-9">{saving ? 'Saving…' : 'Save Settings'}</Button>
        </div>
      </div>

      <div className={`grid gap-4 ${preview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="space-y-4">
          {/* Business Info */}
          <Card style={CARD}>
            <CardHeader className="pb-2"><CardTitle className="text-base text-slate-700">Business Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Business Name</Label><Input className={inp} value={form.business_name} onChange={e=>tf('business_name',e.target.value)}/></div>
                <div><Label>Phone</Label><Input className={inp} value={form.phone} onChange={e=>tf('phone',e.target.value)}/></div>
                <div><Label>Email</Label><Input className={inp} value={form.email} onChange={e=>tf('email',e.target.value)}/></div>
                <div><Label>Address</Label><Input className={inp} value={form.address} onChange={e=>tf('address',e.target.value)}/></div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Layout */}
          <Card style={CARD}>
            <CardHeader className="pb-2"><CardTitle className="text-base text-slate-700">Receipt Layout</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Header Text (shown above business name)</Label>
                <Textarea className="bg-slate-50 border-slate-200 rounded-xl mt-1" rows={2} value={form.receipt_header} onChange={e=>tf('receipt_header',e.target.value)} placeholder="e.g. Welcome to our store!" />
              </div>
              <div>
                <Label>Footer Text (shown at bottom)</Label>
                <Textarea className="bg-slate-50 border-slate-200 rounded-xl mt-1" rows={2} value={form.receipt_footer} onChange={e=>tf('receipt_footer',e.target.value)} />
              </div>
              <div>
                <Label>Paper Size</Label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {PAPER_SIZES.map(s => (
                    <button key={s} onClick={() => tf('receipt_paper_size', s)}
                      className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${form.receipt_paper_size === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      {s.includes('mm') ? <Smartphone className="w-3 h-3 inline mr-1" /> : <Monitor className="w-3 h-3 inline mr-1" />}{s}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax & Options */}
          <Card style={CARD}>
            <CardHeader className="pb-2"><CardTitle className="text-base text-slate-700">Tax & Options</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Default Tax Rate (%)</Label><Input type="number" min="0" max="100" step="0.1" className={inp} value={form.tax_rate} onChange={e=>tf('tax_rate',e.target.value)}/></div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div><p className="font-medium text-slate-700 text-sm">Tax Inclusive Pricing</p><p className="text-xs text-slate-400">Prices already include tax</p></div>
                <Switch checked={form.tax_inclusive} onCheckedChange={v=>tf('tax_inclusive',v)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div><p className="font-medium text-slate-700 text-sm">Show QR Code on Receipt</p><p className="text-xs text-slate-400">Prints a QR code for verification</p></div>
                <Switch checked={form.show_qr_on_receipt} onCheckedChange={v=>tf('show_qr_on_receipt',v)} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        {preview && (
          <Card style={CARD}>
            <CardHeader className="pb-2"><CardTitle className="text-base text-slate-700">Live Preview</CardTitle></CardHeader>
            <CardContent><PreviewCard /></CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
