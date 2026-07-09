import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoices } from '@/hooks/useInvoices';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BarChart3, Settings, RefreshCw } from 'lucide-react';
import InvoiceList from './invoices/InvoiceList';
import InvoiceForm from './invoices/InvoiceForm';
import InvoiceDetail from './invoices/InvoiceDetail';
import InvoiceReports from './invoices/InvoiceReports';
import InvoiceSettings from './invoices/InvoiceSettings';

type View = 'list' | 'create' | 'edit' | 'detail';

export default function OWInvoices() {
  const { appUser } = useAuth();
  const { invoices, loading, reload } = useInvoices();
  const [view, setView] = useState<View>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<'invoices' | 'reports' | 'settings'>('invoices');

  const handleView = (id: string) => { setActiveId(id); setView('detail'); };
  const handleEdit = (id: string) => { setActiveId(id); setView('edit'); };
  const handleCreate = () => { setActiveId(null); setView('create'); };
  const handleBack = () => { setActiveId(null); setView('list'); };
  const handleSaved = (id: string) => { reload(); handleView(id); };

  const canEdit = appUser?.role === 'owner' || appUser?.role === 'superadmin';

  if (view === 'create' || view === 'edit') {
    return (
      <div className="p-4 md:p-6">
        <InvoiceForm
          editId={view === 'edit' ? activeId : null}
          onCancel={handleBack}
          onSaved={handleSaved}
        />
      </div>
    );
  }

  if (view === 'detail' && activeId) {
    return (
      <div className="p-4 md:p-6">
        <InvoiceDetail
          invoiceId={activeId}
          onBack={handleBack}
          onEdit={handleEdit}
          onReload={reload}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage invoices, payments, and collections</p>
        </div>
        <button onClick={reload}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          title="Refresh">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Navigation tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList className="bg-slate-100 rounded-xl p-1 h-auto gap-1">
          <TabsTrigger value="invoices"
            className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm h-9 px-4">
            <FileText className="w-4 h-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="reports"
            className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm h-9 px-4">
            <BarChart3 className="w-4 h-4" /> Reports
          </TabsTrigger>
          {canEdit && (
            <TabsTrigger value="settings"
              className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm h-9 px-4">
              <Settings className="w-4 h-4" /> Settings
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {tab === 'invoices' && (
        <InvoiceList
          invoices={invoices}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onReload={reload}
        />
      )}
      {tab === 'reports' && appUser?.tenant_id && (
        <InvoiceReports tenantId={appUser.tenant_id} />
      )}
      {tab === 'settings' && canEdit && appUser?.tenant_id && (
        <InvoiceSettings tenantId={appUser.tenant_id} />
      )}
    </div>
  );
}
