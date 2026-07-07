import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Search, Plus, Truck, Edit2, Trash2, Eye, X,
  Phone, Mail, MapPin, CreditCard, ChevronLeft, ChevronRight, Download, Package,
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface Supplier {
  id: string; tenant_id: string; name: string; contact_name: string | null;
  phone: string | null; email: string | null; address: string | null;
  balance: number; notes: string | null; created_at: string;
}
interface PO { id: string; total: number; status: string; notes: string | null; created_at: string; }

const PAGE = 20;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = "h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3";
const inpErr = "h-10 bg-red-50 border-red-300 text-slate-900 placeholder:text-slate-400 focus:border-red-400 rounded-xl px-3";
const EMPTY = { name: '', contact_name: '', phone: '', email: '', address: '', notes: '' };

export default function OWSuppliers() {
  const { appUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [detailPOs, setDetailPOs] = useState<PO[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('suppliers').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id).order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.ilike('name', `%${search}%`);
    const { data, count } = await q;
    setSuppliers(Array.isArray(data) ? data : []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (s: Supplier) => {
    setDetail(s);
    setDetailLoading(true);
    const { data } = await supabase.from('purchase_orders').select('id, total, status, notes, created_at')
      .eq('supplier_id', s.id).order('created_at', { ascending: false }).limit(20);
    setDetailPOs(Array.isArray(data) ? data : []);
    setDetailLoading(false);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setNameError('');
    setForm({ name: s.name, contact_name: s.contact_name ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', notes: s.notes ?? '' });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setNameError('Company name is required');
      toast.error('Please enter the supplier company name');
      return;
    }
    setNameError('');
    setSaving(true);
    const payload = {
      name: trimmedName,
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      tenant_id: appUser?.tenant_id,
    };
    const { error } = editing
      ? await supabase.from('suppliers').update(payload).eq('id', editing.id)
      : await supabase.from('suppliers').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editing ? 'Supplier updated' : 'Supplier added');
      setOpen(false); setEditing(null); setForm(EMPTY); setNameError(''); load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Supplier deleted'); load(); }
  };

  const exportCSV = () => {
    const rows = [['Name','Contact','Phone','Email','Balance','Created'].join(','),
      ...suppliers.map(s => [s.name, s.contact_name ?? '', s.phone ?? '', s.email ?? '', s.balance, s.created_at.slice(0, 10)].join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'suppliers.csv'; a.click();
  };

  const totalBalance = suppliers.reduce((s, v) => s + v.balance, 0);
  const totalPages = Math.ceil(total / PAGE);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Suppliers</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage supplier profiles and purchase history</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); setForm(EMPTY); setNameError(''); } }}>
            <DialogTrigger asChild>
              <button className="h-9 px-4 rounded-xl text-sm font-semibold text-white flex items-center gap-2" style={{ background: '#2563EB' }}>
                <Plus className="w-4 h-4" /> Add Supplier
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-slate-200" style={{ background: '#ffffff' }}>
              <DialogHeader><DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-3 mt-2" noValidate>
                {/* Company Name — required */}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="ABC Distributors"
                    value={form.name}
                    required
                    onChange={e => {
                      setForm(p => ({ ...p, name: e.target.value }));
                      if (e.target.value.trim()) setNameError('');
                    }}
                    className={nameError ? inpErr : inp}
                  />
                  {nameError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <span>⚠</span> {nameError}
                    </p>
                  )}
                </div>

                {/* Optional fields */}
                {[
                  { label: 'Contact Person', key: 'contact_name', placeholder: 'Jane Smith', type: 'text' },
                  { label: 'Phone', key: 'phone', placeholder: '+254 700 000 000', type: 'tel' },
                  { label: 'Email', key: 'email', placeholder: 'info@abc.com', type: 'email' },
                  { label: 'Address', key: 'address', placeholder: 'Industrial Area, Nairobi', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{f.label}</Label>
                    <Input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className={inp} />
                  </div>
                ))}

                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Notes</Label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Optional notes…" rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 resize-none" />
                </div>

                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="w-full h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#2563EB' }}
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Supplier'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Suppliers', value: total },
          { label: 'Outstanding Payable', value: fmt(totalBalance) },
          { label: 'Active (with balance)', value: suppliers.filter(s => s.balance > 0).length },
        ].map(k => (
          <Card key={k.label} className="border" style={CARD}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">{k.label}</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '–' : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        {!search && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
        <Input placeholder="Search suppliers…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          className={`h-10 bg-white border-slate-200 rounded-xl px-3 ${!search ? 'pl-9' : 'pl-3'}`} />
      </div>

      <Card className="border" style={CARD}>
        <CardHeader className="px-5 pt-5 pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">{loading ? 'Loading…' : `${total} Supplier${total !== 1 ? 's' : ''}`}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Supplier','Contact','Phone','Email','Balance','Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-20 bg-slate-50" /></td>)}
                  </tr>
                )) : suppliers.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No suppliers yet. Add your first supplier.</td></tr>
                ) : suppliers.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EFF6FF' }}>
                          <Truck className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{s.contact_name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{s.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{s.email ?? '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${s.balance > 0 ? 'text-red-600' : 'text-slate-700'}`}>{fmt(s.balance)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openDetail(s)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><Eye className="w-3.5 h-3.5 text-slate-500" /></button>
                        <button onClick={() => openEdit(s)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><Edit2 className="w-3.5 h-3.5 text-slate-500" /></button>
                        <button onClick={() => handleDelete(s.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">{page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}</span>
              <div className="flex gap-1.5">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5 text-slate-600" /></button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5 text-slate-600" /></button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col" style={{ background: '#ffffff', borderColor: '#E2E8F0', maxHeight: '88vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EFF6FF' }}>
                  <Truck className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{detail.name}</p>
                  <p className="text-xs text-slate-400">{detail.contact_name ?? 'No contact name'}</p>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Phone, label: 'Phone', value: detail.phone ?? '—' },
                  { icon: Mail, label: 'Email', value: detail.email ?? '—' },
                  { icon: MapPin, label: 'Address', value: detail.address ?? '—' },
                  { icon: CreditCard, label: 'Balance Owed', value: fmt(detail.balance) },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-3 flex items-start gap-2.5">
                    <f.icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">{f.label}</p>
                      <p className="text-sm font-medium text-slate-800">{f.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Purchase Orders</p>
                {detailLoading ? <Skeleton className="h-20 w-full bg-slate-50 rounded-xl" />
                  : detailPOs.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No purchase orders</p>
                  : detailPOs.map(po => (
                    <div key={po.id} className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-slate-50 text-sm mb-2">
                      <div>
                        <p className="text-xs text-slate-400">{new Date(po.created_at).toLocaleDateString()}</p>
                        <p className="text-xs capitalize text-slate-500">{po.status}</p>
                      </div>
                      <p className="font-bold text-slate-900">{fmt(po.total)}</p>
                    </div>
                  ))}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
              <button onClick={() => { openEdit(detail); setDetail(null); }} className="flex-1 h-9 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
              <button onClick={() => setDetail(null)} className="flex-1 h-9 rounded-xl text-sm font-bold text-white" style={{ background: '#2563EB' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
