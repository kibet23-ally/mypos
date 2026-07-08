import { useRef } from 'react';
import { X, Download, Printer, CheckCircle2 } from 'lucide-react';
import { type ReceiptData, downloadReceipt, printReceipt } from '@/lib/receiptUtils';

interface ReceiptModalProps {
  data: ReceiptData;
  formatAmt: (n: number) => string;
  onClose: () => void;
}

export default function ReceiptModal({ data, formatAmt, onClose }: ReceiptModalProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  const dateStr = data.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = data.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'hsl(var(--foreground))', border: '1px solid #1E293B', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid #1E293B' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)' }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sale Complete</p>
              <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{data.transactionId}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          <div ref={previewRef}
            className="rounded-xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', fontFamily: 'monospace' }}>

            {/* Receipt top notch */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="flex gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-2 h-1 rounded-full" style={{ background: 'hsl(var(--secondary))' }} />
                ))}
              </div>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {/* Business name */}
              <div className="text-center">
                <p className="text-base font-bold text-foreground tracking-wide uppercase">{data.businessName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 tracking-widest uppercase">Official Receipt</p>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-border" />

              {/* Meta */}
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt #</span>
                  <span className="font-mono font-semibold">{data.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{dateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{timeStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cashier</span>
                  <span>{data.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize font-semibold text-foreground">{data.paymentMethod}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-border" />

              {/* Items header */}
              <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Item</span>
                <div className="flex gap-6">
                  <span>Qty</span>
                  <span>Total</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                {data.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate pr-2">{item.name}</p>
                      <p className="text-muted-foreground">{formatAmt(item.price)} each</p>
                    </div>
                    <div className="flex gap-6 shrink-0 text-right">
                      <span className="text-muted-foreground w-6 text-center">{item.qty}</span>
                      <span className="text-foreground font-semibold w-16">{formatAmt(item.qty * item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-border" />

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatAmt(data.subtotal)}</span>
                </div>
                {data.discount != null && data.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-mono">-{formatAmt(data.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="font-mono">{formatAmt(data.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
                  <span>TOTAL</span>
                  <span className="font-mono" style={{ color: 'hsl(var(--primary))' }}>{formatAmt(data.total)}</span>
                </div>
                {/* Cash tendered / change due — only for cash payments */}
                {data.paymentMethod === 'cash' && data.cashTendered != null && (
                  <>
                    <div className="flex justify-between text-muted-foreground pt-1 border-t border-dashed border-border">
                      <span>Cash Tendered</span>
                      <span className="font-mono">{formatAmt(data.cashTendered)}</span>
                    </div>
                    <div className="flex justify-between font-bold" style={{ color: '#16A34A' }}>
                      <span>Change Due</span>
                      <span className="font-mono">{formatAmt(data.changeDue ?? 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-dashed border-border" />
              <div className="text-center space-y-0.5">
                <p className="text-xs text-muted-foreground">Thank you for your purchase!</p>
                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Powered by PosifyPro</p>
              </div>

              {/* Bottom notch */}
              <div className="flex justify-center pt-1">
                <div className="flex gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="w-2 h-1 rounded-full" style={{ background: 'hsl(var(--secondary))' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 px-4 pb-4 pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => downloadReceipt(data)}
              className="h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--muted-foreground))', border: '1px solid #334155' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563EB')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button onClick={() => printReceipt(data)}
              className="h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--muted-foreground))', border: '1px solid #334155' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563EB')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
          <button onClick={onClose}
            className="w-full h-10 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'hsl(var(--primary))' }}>
            Close &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
