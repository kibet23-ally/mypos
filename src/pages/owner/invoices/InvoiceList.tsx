import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Search, Plus, Eye, Edit2, Copy, XCircle, Download, FileSpreadsheet,
  Filter, ChevronLeft, ChevronRight, FileText,
} from 'lucide-react';
import type { Invoice, InvoiceStatus } from '@/types/invoice';
import { STATUS_LABELS, STATUS_COLORS, fmt } from '@/types/invoice';
import { format } from 'date-fns';
import { cancelInvoice, duplicateInvoice, softDeleteInvoice } from '@/services/invoiceService';
import { generateInvoicePDF } from '@/lib/invoicePDF';
import { useAuth } from '@/contexts/AuthContext';

const CARD_STYLE = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const PAGE_SIZE = 15;

interface Props {
  invoices: Invoice[];
  loading: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
  onReload: () => void;
}

export default function InvoiceList({ invoices, loading, onView, onEdit, onCreate, onReload }: Props) {
  const { appUser } = useAuth();
  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 200);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = invoices;
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.invoice_number.toLowerCase().includes(q) ||
        r.customer?.name?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [invoices, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCancel = async (inv: Invoice) => {
    if (!confirm(`Cancel invoice ${inv.invoice_number}?`)) return;
    try { await cancelInvoice(inv.id); toast.success('Invoice cancelled'); onReload(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const handleDuplicate = async (inv: Invoice) => {
    if (!appUser?.tenant_id || !appUser?.id) return;
    try {
      await duplicateInvoice(inv, appUser.tenant_id, appUser.id);
      toast.success('Invoice duplicated as draft'); onReload();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const handleDownloadPDF = async (inv: Invoice) => {
    try {
      await generateInvoicePDF(inv, {
        businessName: appUser?.tenant?.business_name ?? 'My Business',
        businessEmail: appUser?.email,
        businessPhone: appUser?.phone_number ?? undefined,
      });
    } catch { toast.error('Failed to generate PDF'); }
  };

  const handleExportCSV = () => {
    const headers = ['Invoice #','Customer','Date','Due Date','Total','Paid','Balance','Status'];
    const rows = filtered.map(inv => [
      inv.invoice_number,
      inv.customer?.name ?? '',
      format(new Date(inv.created_at), 'dd/MM/yyyy'),
      inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : '',
      inv.total.toFixed(2),
      inv.paid_amount.toFixed(2),
      inv.balance_due.toFixed(2),
      STATUS_LABELS[inv.status],
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const canEdit = appUser?.role === 'owner' || appUser?.role === 'superadmin';

  // Summary stats
  const stats = useMemo(() => ({
    total: invoices.length,
    outstanding: invoices.filter(i => ['pending_payment','partially_paid'].includes(i.status)).length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalValue: invoices.reduce((s, i) => s + i.total, 0),
    totalBalance: invoices.reduce((s, i) => s + i.balance_due, 0),
  }), [invoices]);

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoices', value: stats.total.toString(), sub: 'all time', color: 'hsl(var(--primary))' },
          { label: 'Total Invoiced', value: fmt(stats.totalValue), sub: 'gross amount', color: 'hsl(var(--primary))' },
          { label: 'Outstanding', value: fmt(stats.totalBalance), sub: `${stats.outstanding} invoices`, color: '#D97706' },
          { label: 'Overdue', value: stats.overdue.toString(), sub: 'need attention', color: '#DC2626' },
        ].map(k => (
          <Card key={k.label} className="border" style={CARD_STYLE}>
            <CardContent className="p-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                style={{ background: `${k.color}15`, border: `1px solid ${k.color}25` }}>
                <FileText className="w-3.5 h-3.5" style={{ color: k.color }} />
              </div>
              <p className="text-lg font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by invoice # or customer…"
            value={searchRaw} onChange={e => { setSearchRaw(e.target.value); setPage(1); }}
            className="pl-9 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl" />
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-44 bg-card border-border rounded-xl text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button onClick={handleExportCSV} title="Export CSV"
            className="h-10 px-3 rounded-xl border border-border bg-white text-muted-foreground hover:bg-card transition-colors flex items-center gap-1.5 text-sm">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden md:inline">CSV</span>
          </button>
          {canEdit && (
            <button onClick={onCreate}
              className="h-10 px-4 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
              style={{ background: 'hsl(var(--primary))' }}>
              <Plus className="w-4 h-4" /> New Invoice
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            {loading ? 'Loading…' : `${filtered.length} Invoice${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Invoice #','Customer','Date','Due Date','Total','Paid','Balance','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16 bg-secondary" /></td>
                    ))}
                  </tr>
                )) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {search || statusFilter !== 'all' ? 'No invoices match your filters.' : 'No invoices yet. Create your first invoice.'}
                    </td>
                  </tr>
                ) : pageRows.map(inv => {
                  const sc = STATUS_COLORS[inv.status];
                  const isEditable = ['draft','sent','pending_payment','partially_paid'].includes(inv.status);
                  return (
                    <tr key={inv.id} className="border-b border-border hover:bg-card transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => onView(inv.id)}
                          className="text-sm font-mono font-medium text-primary hover:underline whitespace-nowrap">
                          {inv.invoice_number}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap max-w-[140px] truncate">
                        {inv.customer?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(inv.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {inv.due_date ? (
                          <span className={inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                            {format(new Date(inv.due_date), 'dd MMM yyyy')}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">{fmt(inv.total)}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600 whitespace-nowrap">{fmt(inv.paid_amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${inv.balance_due > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {fmt(inv.balance_due)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
                          style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                          {STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => onView(inv.id)} title="View"
                            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-colors">
                            <Eye className="w-3.5 h-3.5 text-primary" />
                          </button>
                          {canEdit && isEditable && (
                            <button onClick={() => onEdit(inv.id)} title="Edit"
                              className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          )}
                          <button onClick={() => handleDownloadPDF(inv)} title="Download PDF"
                            className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          {canEdit && (
                            <button onClick={() => handleDuplicate(inv)} title="Duplicate"
                              className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          )}
                          {canEdit && inv.status !== 'cancelled' && inv.status !== 'paid' && (
                            <button onClick={() => handleCancel(inv)} title="Cancel"
                              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors">
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:bg-card transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs px-2 text-muted-foreground">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:bg-card transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
