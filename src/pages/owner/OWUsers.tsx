import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Search, Plus, UserCog, Edit2, UserX, Eye, X, Shield, Clock,
  ChevronLeft, ChevronRight, User, Mail, Phone, Calendar,
} from 'lucide-react';

interface StaffUser {
  id: string;
  email: string;
  display_name: string | null;
  phone_number: string | null;
  role: string;
  tenant_id: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
  user?: { display_name: string | null; email: string };
}

type Tab = 'users' | 'roles' | 'activity';

const PAGE = 20;
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3';

const ROLE_COLORS: Record<string, string> = {
  owner:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  cashier: 'bg-amber-50 text-amber-700 border-amber-200',
  manager: 'bg-blue-50 text-blue-700 border-blue-200',
};

const ROLES = [
  { key: 'manager', label: 'Manager', desc: 'All cashier permissions + reports and staff overview' },
      { key: 'cashier', label: 'Cashier', desc: 'Can use POS, view products and own sales history' },
  { key: 'manager', label: 'Manager', desc: 'All cashier permissions + reports and staff overview' },
  { key: 'owner', label: 'Owner', desc: 'Full access to all modules, settings, and data' },
];

const PERMISSIONS: Record<string, string[]> = {
  cashier: ['Point of Sale', 'View Products', 'Own Sales History', 'Own Profile'],
  manager: ['Point of Sale', 'View Products', 'All Sales History', 'Reports', 'Staff Overview', 'Customers (view)'],
  owner:   ['Point of Sale', 'Products (CRUD)', 'Sales', 'Customers', 'Suppliers', 'Users & Roles', 'Reports', 'Settings', 'Notifications'],
};

export default function OWUsers() {
  const { appUser } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<StaffUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ display_name: '', phone_number: '', role: 'cashier' });
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('profiles').select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id)
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search) q = q.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, count } = await q;
    setUsers(Array.isArray(data) ? data : []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [appUser?.tenant_id, page, search]);

  const loadLogs = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLogsLoading(true);
    // Read recent sales as proxy activity logs
    const { data } = await supabase.from('sales')
      .select('id, cashier_id, transaction_id, created_at, cashier:profiles!cashier_id(display_name, email)')
      .eq('tenant_id', appUser.tenant_id)
      .order('created_at', { ascending: false })
      .limit(50);
    const mapped: ActivityLog[] = (data ?? []).map((s: any) => ({
      id: s.id,
      user_id: s.cashier_id,
      action: `Processed sale ${s.transaction_id}`,
      created_at: s.created_at,
      user: s.cashier,
    }));
    setLogs(mapped);
    setLogsLoading(false);
  }, [appUser?.tenant_id]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (tab === 'activity') loadLogs(); }, [tab, loadLogs]);

  const openEdit = (u: StaffUser) => {
    setEditUser(u);
    setEditForm({ display_name: u.display_name ?? '', phone_number: u.phone_number ?? '', role: u.role });
    setEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      display_name: editForm.display_name || null,
      phone_number: editForm.phone_number || null,
      role: editForm.role,
    }).eq('id', editUser.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success('User updated'); setEditOpen(false); setEditUser(null); loadUsers(); }
  };

  const handleDeactivate = async (u: StaffUser) => {
    if (!confirm(`Deactivate ${u.display_name ?? u.email}? They will lose access.`)) return;
    // Remove tenant association to revoke access
    const { error } = await supabase.from('profiles').update({ tenant_id: null }).eq('id', u.id);
    if (error) toast.error(error.message);
    else { toast.success('User deactivated'); loadUsers(); }
  };

  const totalPages = Math.ceil(total / PAGE);
  const roleCount = (r: string) => users.filter(u => u.role === r).length;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Users &amp; Roles</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage staff access, roles and permissions</p>
        </div>
        <div className="flex gap-2">
          {(['users', 'roles', 'activity'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`h-9 px-4 rounded-xl text-sm font-semibold capitalize transition-colors ${tab === t ? 'text-white' : 'text-slate-600 border border-slate-200 bg-white hover:bg-slate-50'}`}
              style={tab === t ? { background: '#2563EB' } : undefined}>
              {t === 'activity' ? 'Activity Log' : t}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Staff', value: total },
          { label: 'Owners', value: roleCount('owner') },
          { label: 'Cashiers', value: roleCount('cashier') },
          { label: 'Managers', value: roleCount('manager') },
        ].map(k => (
          <Card key={k.label} className="border" style={CARD}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">{k.label}</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '–' : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tab === 'roles' ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Role Definitions &amp; Permissions</h3>
          {ROLES.map(r => (
            <Card key={r.key} className="border" style={CARD}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-slate-900 capitalize">{r.label}</span>
                      <Badge className={`text-xs border capitalize ${ROLE_COLORS[r.key] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>{roleCount(r.key)} users</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{r.desc}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(PERMISSIONS[r.key] ?? []).map(p => (
                    <span key={p} className="text-xs px-2.5 py-1 rounded-full border font-medium" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>
                      {p}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tab === 'activity' ? (
        <Card className="border" style={CARD}>
          <CardHeader className="px-5 pt-5 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['User','Action','Date & Time'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {[1,2,3].map(j => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-28 bg-slate-50" /></td>)}
                    </tr>
                  )) : logs.length === 0 ? (
                    <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-400">No activity yet</td></tr>
                  ) : logs.map(l => (
                    <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#2563EB' }}>
                            {(l.user?.display_name ?? l.user?.email ?? 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-700 whitespace-nowrap">{l.user?.display_name ?? l.user?.email ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{l.action}</td>
                      <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative max-w-sm">
            {!search && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
            <Input placeholder="Search users…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              className={`h-10 bg-white border-slate-200 rounded-xl px-3 ${!search ? 'pl-9' : 'pl-3'}`} />
          </div>

          <Card className="border" style={CARD}>
            <CardHeader className="px-5 pt-5 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900">{loading ? 'Loading…' : `${total} Staff Member${total !== 1 ? 's' : ''}`}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['User','Email','Phone','Role','Joined','Actions'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {[1,2,3,4,5,6].map(j => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-20 bg-slate-50" /></td>)}
                      </tr>
                    )) : users.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No staff users found</td></tr>
                    ) : users.map(u => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: u.id === appUser?.id ? '#2563EB' : '#64748B' }}>
                              {(u.display_name ?? u.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{u.display_name ?? '—'}</span>
                              {u.id === appUser?.id && <span className="ml-1.5 text-xs text-blue-500">(You)</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{u.email}</td>
                        <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{u.phone_number ?? '—'}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <Badge className={`text-xs border capitalize ${ROLE_COLORS[u.role] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>{u.role}</Badge>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{u.created_at.slice(0, 10)}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setDetail(u)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><Eye className="w-3.5 h-3.5 text-slate-500" /></button>
                            <button onClick={() => openEdit(u)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><Edit2 className="w-3.5 h-3.5 text-slate-500" /></button>
                            {u.id !== appUser?.id && (
                              <button onClick={() => handleDeactivate(u)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50" title="Deactivate">
                                <UserX className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            )}
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
        </>
      )}

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={o => { setEditOpen(o); if (!o) setEditUser(null); }}>
        <DialogContent className="max-w-sm border-slate-200" style={{ background: '#ffffff' }}>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Display Name</Label>
              <Input value={editForm.display_name} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} placeholder="Full name" className={inp} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Phone</Label>
              <Input value={editForm.phone_number} onChange={e => setEditForm(p => ({ ...p, phone_number: e.target.value }))} placeholder="+254…" className={inp} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Role</Label>
              <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-400">
                {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <button type="submit" disabled={saving} className="w-full h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#2563EB' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl border shadow-2xl" style={{ background: '#ffffff', borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">User Profile</p>
              <button onClick={() => setDetail(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: '#2563EB' }}>
                  {(detail.display_name ?? detail.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{detail.display_name ?? '—'}</p>
                  <Badge className={`text-xs border capitalize mt-1 ${ROLE_COLORS[detail.role] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>{detail.role}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { icon: Mail, label: 'Email', value: detail.email },
                  { icon: Phone, label: 'Phone', value: detail.phone_number ?? '—' },
                  { icon: Calendar, label: 'Joined', value: detail.created_at.slice(0, 10) },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl text-sm">
                    <f.icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">{f.label}</p>
                      <p className="text-slate-800 font-medium">{f.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Permissions</p>
                <div className="flex flex-wrap gap-1.5">
                  {(PERMISSIONS[detail.role] ?? []).map(p => (
                    <span key={p} className="text-xs px-2 py-1 rounded-full border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-4">
              <button onClick={() => setDetail(null)} className="w-full h-9 rounded-xl text-sm font-bold text-white" style={{ background: '#2563EB' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
