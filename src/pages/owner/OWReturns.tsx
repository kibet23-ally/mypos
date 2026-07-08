import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Search, Plus, RefreshCw, Trash2, X, ChevronLeft, ChevronRight,
  CheckCircle, ArrowLeftRight, Info,
} from 'lucide-react';

// ── Matches the REAL production sales_returns table exactly ──────────────
// (id, tenant_id, sale_id, reason, amount, created_at) — confirmed via
// information_schema. No status/approval workflow and no line-item detail
// exist at the DB level, so this page doesn't pretend they do.
interface SaleReturn {
  id: string;
  tenant_id: string;
  sale_id: string | null;
  reason: string | null;
  amount: number;
  created_at: string;
}
interface Sale { id: string; receipt_number: string | null; total_amount: number; created_at: string; }

const PAGE = 15;
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const inp = 'h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl px-3';

export default function OWReturns() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [saleSearch, setSaleSearch] = useState('');
  const [saleResults, setSaleResults] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [form, setForm] = useState({ amount: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('sales_returns').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id).order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.ilike('reason', `%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setReturns((data ?? []) as SaleReturn[]); setTotal(count ?? 0); }
    else toast.error(error.message);
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  useEffect(() => { load(); }, [load]);

  const searchSales = async () => {
    if (!appUser?.tenant_id || !saleSearch.trim()) return;
    const { data } = await supabase.from('sales').select('id,receipt_number,total_amount,created_at')
      .eq('tenant_id', appUser.tenant_id)
      .ilike('receipt_number', `%${saleSearch}%`)
      .order('created_at', { ascending: false }).limit(10);
    setSaleResults((data ?? []) as Sale[]);
  };

  const selectSale = (s: Sale) => {
    setSelectedSale(s);
    setSaleResults([]);
    if (!form.amount) setForm(f => ({ ...f, amount: String(s.total_amount) }));
  };

  const save = async () => {
    if (!appUser?.tenant_id) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a refund amount greater than 0'); return; }
    setSaving(true);
    const { error } = await supabase.from('sales_returns').insert({
      tenant_id: appUser.tenant_id,
      sale_id: selectedSale?.id ?? null,
      reason: form.reason || null,
      amount,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Return recorded');
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this return record?')) return;
    const { error } = await supabase.from('sales_returns').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    load();
  };

  const resetForm = () => {
    setSelectedSale(null); setSaleSearch(''); setSaleResults([]);
    setForm({ amount: '', reason: '' });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Returns</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} className="bg-primary hover:opacity-90 text-white h-9 gap-1">
          <Plus className="w-4 h-4" />Record Return
        </Button>
      </div>

      <div className="flex items-start gap-2 bg-accent border border-primary rounded-xl px-3 py-2 text-xs text-primary">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Returns here record the refund amount only — this ties to a simpler return record, not per-item detail.
          If physical stock came back, add it separately from <span className="font-semibold">Inventory → Stock Movements</span> so inventory stays accurate.
        </p>
      </div>

      <Card style={CARD}>
        <CardHeader className="pb-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className={`${inp} pl-9`} placeholder="Search by reason…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : returns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No returns yet.</p></div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-border">
                {['Sale', 'Amount', 'Reason', 'Date', 'Actions'].map(h =>
                  <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                )}
              </tr></thead>
              <tbody>{returns.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-card">
                  <td className="py-2 px-3 font-mono text-primary">{r.sale_id ? r.sale_id.slice(0, 8) : '—'}</td>
                  <td className="py-2 px-3 font-semibold text-red-600">{fmt(r.amount)}</td>
                  <td className="py-2 px-3 text-muted-foreground max-w-[220px] truncate">{r.reason || '—'}</td>
                  <td className="py-2 px-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="py-2 px-3">
                    {appUser?.role === 'owner' && (
                      <button onClick={() => del(r.id)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {total > PAGE && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Showing {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Return Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record a Return</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Find Original Sale (optional)</Label>
              <div className="flex gap-2 mt-1">
                <Input className={`${inp} flex-1`} placeholder="Receipt number…" value={saleSearch} onChange={e => setSaleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchSales()} />
                <Button variant="outline" onClick={searchSales}>Search</Button>
              </div>
              {saleResults.length > 0 && (
                <div className="mt-2 border border-border rounded-xl overflow-hidden">
                  {saleResults.map(s => (
                    <button key={s.id} onClick={() => selectSale(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between border-b border-border last:border-0">
                      <span className="font-medium text-foreground">{s.receipt_number || s.id.slice(0, 8)}</span>
                      <span className="text-muted-foreground">{fmt(s.total_amount)} — {new Date(s.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedSale && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{selectedSale.receipt_number || selectedSale.id.slice(0, 8)} — {fmt(selectedSale.total_amount)}</span>
                  <button onClick={() => setSelectedSale(null)} className="ml-auto"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            <div>
              <Label>Refund Amount</Label>
              <Input type="number" min="0" step="0.01" className={inp} value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>

            <div>
              <Label>Reason</Label>
              <Textarea className="bg-card border-border rounded-xl" rows={2} value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Defective, wrong item…" />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-primary hover:opacity-90 text-white" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Return'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
