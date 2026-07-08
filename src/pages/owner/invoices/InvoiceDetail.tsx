import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, Edit2, Copy, XCircle, CreditCard, Printer,
  Building2, User, Calendar, FileText, Package, Clock,
} from 'lucide-react';
import { fetchInvoiceById, cancelInvoice, duplicateInvoice, issueInvoice } from '@/services/invoiceService';
import { generateInvoicePDF } from '@/lib/invoicePDF';
import { fetchCustomerInvoiceSummary } from '@/services/invoiceService';
import type { Invoice } from '@/types/invoice';
import { STATUS_LABELS, STATUS_COLORS, fmt, PAYMENT_METHOD_LABELS } from '@/types/invoice';
import { format } from 'date-fns';
import RecordPaymentModal from './RecordPaymentModal';

const CARD_STYLE = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };

interface Props {
  invoiceId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onReload: () => void;
}

export default function InvoiceDetail({ invoiceId, onBack, onEdit, onReload }: Props) {
  const { appUser } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerSummary, setCustomerSummary] = useState<{
    totalInvoices: number; paidInvoices: number; overdueInvoices: number; outstandingBalance: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inv = await fetchInvoiceById(invoiceId);
      setInvoice(inv);
      if (inv?.customer_id) {
        const summary = await fetchCustomerInvoiceSummary(inv.customer_id);
        setCustomerSummary(summary);
      }
    } finally { setLoading(false); }
  }, [invoiceId]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!invoice) return;
    if (!confirm(`Cancel invoice ${invoice.invoice_number}?`)) return;
    try { await cancelInvoice(invoice.id); toast.success('Invoice cancelled'); load(); onReload(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const handleDuplicate = async () => {
    if (!invoice || !appUser?.tenant_id || !appUser?.id) return;
    try {
      const dup = await duplicateInvoice(invoice, appUser.tenant_id, appUser.id);
      toast.success('Invoice duplicated as draft'); onReload(); onEdit(dup.id);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const handleIssue = async () => {
    if (!invoice) return;
    try { await issueInvoice(invoice.id); toast.success('Invoice issued'); load(); onReload(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      await generateInvoicePDF(invoice, {
        businessName: appUser?.tenant?.business_name ?? 'My Business',
        businessEmail: appUser?.email,
        businessPhone: appUser?.phone_number ?? undefined,
      });
    } catch { toast.error('PDF generation failed'); }
  };

  const canEdit = appUser?.role === 'owner' || appUser?.role === 'superadmin';
  const canRecord = ['owner', 'superadmin', 'cashier'].includes(appUser?.role ?? '');
  const isEditable = invoice && ['draft', 'sent', 'pending_payment', 'partially_paid'].includes(invoice.status);
  const canPay = invoice && ['sent', 'pending_payment', 'partially_paid', 'overdue'].includes(invoice.status);

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-secondary rounded-xl" />)}
    </div>
  );

  if (!invoice) return (
    <div className="text-center py-20 text-muted-foreground">
      <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>Invoice not found.</p>
      <button onClick={onBack} className="mt-4 text-sm text-primary hover:underline">← Back to list</button>
    </div>
  );

  const sc = STATUS_COLORS[invoice.status];
  const items = invoice.items ?? [];
  const payments = invoice.payments ?? [];

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-card transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-foreground font-mono">{invoice.invoice_number}</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
              style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
              {STATUS_LABELS[invoice.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {invoice.customer?.name} — Created {format(new Date(invoice.created_at), 'dd MMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {invoice.status === 'draft' && canEdit && (
            <button onClick={handleIssue}
              className="h-9 px-4 rounded-xl text-sm font-medium border border-primary text-primary hover:bg-accent transition-colors">
              Issue Invoice
            </button>
          )}
          {canPay && canRecord && (
            <button onClick={() => setPaymentOpen(true)}
              className="h-9 px-4 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
              style={{ background: '#16A34A' }}>
              <CreditCard className="w-4 h-4" /> Record Payment
            </button>
          )}
          <button onClick={handlePrint}
            className="h-9 px-3 rounded-xl border border-border bg-white text-muted-foreground hover:bg-card transition-colors flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
          {canEdit && isEditable && (
            <button onClick={() => onEdit(invoice.id)}
              className="h-9 px-3 rounded-xl border border-border bg-white text-muted-foreground hover:bg-card transition-colors flex items-center gap-1.5 text-sm">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          )}
          {canEdit && (
            <button onClick={handleDuplicate}
              className="h-9 px-3 rounded-xl border border-border bg-white text-muted-foreground hover:bg-card transition-colors flex items-center gap-1.5 text-sm">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
          )}
          {canEdit && invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button onClick={handleCancel}
              className="h-9 px-3 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 text-sm">
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Main invoice content */}
        <div className="xl:col-span-2 space-y-5">
          {/* Business + Customer Info */}
          <Card className="border" style={CARD_STYLE}>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</p>
                </div>
                <p className="text-sm font-bold text-foreground">{appUser?.tenant?.business_name ?? 'My Business'}</p>
                {appUser?.email && <p className="text-xs text-muted-foreground mt-0.5">{appUser.email}</p>}
                {appUser?.phone_number && <p className="text-xs text-muted-foreground">{appUser.phone_number}</p>}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bill To</p>
                </div>
                <p className="text-sm font-bold text-foreground">{invoice.customer?.name}</p>
                {invoice.customer?.email && <p className="text-xs text-muted-foreground mt-0.5">{invoice.customer.email}</p>}
                {invoice.customer?.phone && <p className="text-xs text-muted-foreground">{invoice.customer.phone}</p>}
                {invoice.customer?.address && <p className="text-xs text-muted-foreground">{invoice.customer.address}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Issue Date', value: invoice.issued_at ? format(new Date(invoice.issued_at), 'dd MMM yyyy') : '—', icon: Calendar, color: 'hsl(var(--primary))' },
              { label: 'Due Date', value: invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : '—', icon: Clock, color: invoice.status === 'overdue' ? '#DC2626' : '#D97706' },
              { label: 'Payment Terms', value: invoice.payment_terms ?? '—', icon: FileText, color: 'hsl(var(--primary))' },
            ].map(f => (
              <Card key={f.label} className="border" style={CARD_STYLE}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                    <f.icon className="w-3.5 h-3.5" style={{ color: f.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-semibold text-foreground truncate">{f.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Items Table */}
          <Card className="border" style={CARD_STYLE}>
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Item', 'SKU', 'Qty', 'Unit Price', 'Disc %', 'Total'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-card/50'}`}>
                        <td className="px-5 py-3 text-sm font-medium text-foreground whitespace-nowrap">{item.name}</td>
                        <td className="px-5 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{item.sku ?? '—'}</td>
                        <td className="px-5 py-3 text-sm text-foreground whitespace-nowrap">{item.quantity}</td>
                        <td className="px-5 py-3 text-sm text-foreground whitespace-nowrap">{fmt(item.unit_price)}</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">{item.discount_pct}%</td>
                        <td className="px-5 py-3 text-sm font-bold text-foreground whitespace-nowrap">{fmt(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(invoice.notes || invoice.payment_terms) && (
            <Card className="border" style={CARD_STYLE}>
              <CardContent className="p-5 space-y-4">
                {invoice.notes && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
                {invoice.payment_terms && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Terms & Conditions</p>
                    <p className="text-sm text-foreground">{invoice.payment_terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Totals + Payments + Customer Profile */}
        <div className="space-y-5">
          {/* Totals */}
          <Card className="border" style={CARD_STYLE}>
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-foreground">Invoice Totals</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{fmt(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-red-500">- {fmt(invoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({(invoice.tax_rate * 100).toFixed(0)}%)</span>
                <span className="text-foreground">{fmt(invoice.tax_amount)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between">
                <span className="text-base font-bold text-foreground">Total</span>
                <span className="text-base font-bold text-primary">{fmt(invoice.total)}</span>
              </div>
              {invoice.paid_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-emerald-600 font-medium">- {fmt(invoice.paid_amount)}</span>
                </div>
              )}
              {invoice.balance_due > 0 && (
                <div className="flex justify-between pt-2 border-t border-red-100">
                  <span className="text-sm font-bold text-red-600">Balance Due</span>
                  <span className="text-sm font-bold text-red-600">{fmt(invoice.balance_due)}</span>
                </div>
              )}
              {invoice.status === 'paid' && (
                <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-sm font-semibold text-emerald-700">✓ Fully Paid</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="border" style={CARD_STYLE}>
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                Payment History
                {canPay && canRecord && (
                  <button onClick={() => setPaymentOpen(true)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors">
                    + Record
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {payments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No payments recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-card border border-border">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{PAYMENT_METHOD_LABELS[p.method]}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.paid_at), 'dd MMM yyyy HH:mm')}</p>
                        {p.reference && <p className="text-xs text-muted-foreground font-mono">{p.reference}</p>}
                      </div>
                      <span className="text-sm font-bold text-emerald-600 shrink-0">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Profile */}
          {customerSummary && (
            <Card className="border" style={CARD_STYLE}>
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Customer Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-sm font-bold text-foreground mb-3">{invoice.customer?.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Total Invoices', value: customerSummary.totalInvoices.toString(), color: 'hsl(var(--primary))' },
                    { label: 'Paid', value: customerSummary.paidInvoices.toString(), color: '#16A34A' },
                    { label: 'Overdue', value: customerSummary.overdueInvoices.toString(), color: '#DC2626' },
                    { label: 'Outstanding', value: fmt(customerSummary.outstandingBalance), color: '#D97706' },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl bg-card border border-border p-2.5">
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: k.color }}>{k.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {paymentOpen && (
        <RecordPaymentModal
          invoice={invoice}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onSuccess={() => { load(); onReload(); }}
        />
      )}
    </div>
  );
}