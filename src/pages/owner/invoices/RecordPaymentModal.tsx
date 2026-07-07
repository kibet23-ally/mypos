import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { recordPayment } from '@/services/invoiceService';
import type { Invoice, PaymentMethod } from '@/types/invoice';
import { fmt, PAYMENT_METHOD_LABELS } from '@/types/invoice';
import { CreditCard, DollarSign } from 'lucide-react';

const inputClass = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';

interface Props {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export default function RecordPaymentModal({ invoice, open, onOpenChange, onSuccess }: Props) {
  const { appUser } = useAuth();
  const remaining = invoice.balance_due;

  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (amt > remaining + 0.01) { toast.error(`Amount cannot exceed balance due (${fmt(remaining)})`); return; }
    if (!appUser?.tenant_id || !appUser?.id) return;

    setSaving(true);
    try {
      await recordPayment(invoice.id, appUser.tenant_id, appUser.id, amt, method, reference, notes);
      toast.success(`Payment of ${fmt(amt)} recorded`);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            </div>
            Record Payment
          </DialogTitle>
        </DialogHeader>

        {/* Balance summary */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Invoice</p>
              <p className="text-sm font-semibold text-slate-900">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Balance Due</p>
              <p className="text-base font-bold text-red-600">{fmt(remaining)}</p>
            </div>
          </div>
          {invoice.paid_amount > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-500">
              <span>Total</span><span className="font-medium text-slate-700">{fmt(invoice.total)}</span>
              <span className="ml-4">Already Paid</span><span className="font-medium text-emerald-600">{fmt(invoice.paid_amount)}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Amount (KSh) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="number" step="0.01" min="0.01" max={remaining + 0.01}
                value={amount} onChange={e => setAmount(e.target.value)}
                className={`${inputClass} pl-9`} placeholder="0.00"
              />
            </div>
            <div className="flex gap-2 mt-1.5">
              {[0.25, 0.5, 0.75, 1].map(f => (
                <button key={f} type="button" onClick={() => setAmount((remaining * f).toFixed(2))}
                  className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  {f === 1 ? 'Full' : `${f * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Payment Method</Label>
            <Select value={method} onValueChange={v => setMethod(v as PaymentMethod)}>
              <SelectTrigger className="h-10 bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(method === 'mpesa' || method === 'bank_transfer' || method === 'card') && (
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Reference / Transaction ID
              </Label>
              <Input value={reference} onChange={e => setReference(e.target.value)}
                className={inputClass} placeholder={method === 'mpesa' ? 'e.g. QDB12345XY' : 'Reference number'} />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Notes (optional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)}
              className={inputClass} placeholder="Any additional notes…" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)}
              className="flex-1 h-10 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors bg-white">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ background: '#2563EB' }}>
              {saving ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
