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
        style={{ background: '#0F172A', border: '1px solid #1E293B', maxHeight: '92vh' }}>

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
              <p className="text-xs" style={{ color: '#64748B' }}>{data.transactionId}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          <div ref={previewRef}
            className="rounded-xl overflow-hidden"
            style={{ background: '#ffffff', fontFamily: 'monospace' }}>

            {/* Receipt top notch */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="flex gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-2 h-1 rounded-full" style={{ background: '#E2E8F0' }} />
                ))}
              </div>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {/* Business name */}
              <div className="text-center">
                <p className="text-base font-bold text-slate-900 tracking-wide uppercase">{data.businessName}</p>
                <p className="text-xs text-slate-400 mt-0.5 tracking-widest uppercase">Official Receipt</p>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-200" />

              {/* Meta */}
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Receipt #</span>
                  <span className="font-mono font-semibold">{data.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date</span>
                  <span>{dateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time</span>
                  <span>{timeStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cashier</span>
                  <span>{data.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment</span>
                  <span className="capitalize font-semibold text-slate-800">{data.paymentMethod}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-200" />

              {/* Items header */}
              <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wide">
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
                      <p className="text-slate-800 font-medium truncate pr-2">{item.name}</p>
                      <p className="text-slate-400">{formatAmt(item.price)} each</p>
                    </div>
                    <div className="flex gap-6 shrink-0 text-right">
                      <span className="text-slate-600 w-6 text-center">{item.qty}</span>
                      <span className="text-slate-800 font-semibold w-16">{formatAmt(item.qty * item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-200" />

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatAmt(data.subtotal)}</span>
                </div>
                {data.discount != null && data.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-mono">-{formatAmt(data.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Tax</span>
                  <span className="font-mono">{formatAmt(data.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL</span>
                  <span className="font-mono" style={{ color: '#2563EB' }}>{formatAmt(data.total)}</span>
                </div>
                {/* Cash tendered / change due — only for cash payments */}
                {data.paymentMethod === 'cash' && data.cashTendered != null && (
                  <>
                    <div className="flex justify-between text-slate-500 pt-1 border-t border-dashed border-slate-200">
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
              <div className="border-t border-dashed border-slate-200" />
              <div className="text-center space-y-0.5">
                <p className="text-xs text-slate-400">Thank you for your purchase!</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Powered by PosifyPro</p>
              </div>

              {/* Bottom notch */}
              <div className="flex justify-center pt-1">
                <div className="flex gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="w-2 h-1 rounded-full" style={{ background: '#E2E8F0' }} />
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
              style={{ background: '#1E293B', color: '#CBD5E1', border: '1px solid #334155' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563EB')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button onClick={() => printReceipt(data)}
              className="h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ background: '#1E293B', color: '#CBD5E1', border: '1px solid #334155' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563EB')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
          <button onClick={onClose}
            className="w-full h-10 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#2563EB' }}>
            Close &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
