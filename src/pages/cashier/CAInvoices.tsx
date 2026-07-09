import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoices } from '@/hooks/useInvoices';
import { RefreshCw, Receipt } from 'lucide-react';
import InvoiceList from '@/pages/owner/invoices/InvoiceList';
import InvoiceDetail from '@/pages/owner/invoices/InvoiceDetail';
import RecordPaymentModal from '@/pages/owner/invoices/RecordPaymentModal';
import type { Invoice } from '@/types/invoice';

type View = 'list' | 'detail';

// Cashier can: view invoices, record payments. Cannot create/edit/cancel.
export default function CAInvoices() {
  const { appUser } = useAuth();
  const { invoices, loading, reload } = useInvoices();
  const [view, setView] = useState<View>('list');
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleView = (id: string) => { setActiveId(id); setView('detail'); };
  const handleBack = () => { setActiveId(null); setView('list'); };

  if (view === 'detail' && activeId) {
    return (
      <div className="p-4 md:p-6">
        <InvoiceDetail
          invoiceId={activeId}
          onBack={handleBack}
          onEdit={() => {}} // cashier cannot edit
          onReload={reload}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and record payments on invoices</p>
        </div>
        <button onClick={reload}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          title="Refresh">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <InvoiceList
        invoices={invoices}
        loading={loading}
        onView={handleView}
        onEdit={() => {}} // cashier: no edit
        onCreate={() => {}} // cashier: no create (button hidden by role check inside InvoiceList)
        onReload={reload}
      />
    </div>
  );
}
