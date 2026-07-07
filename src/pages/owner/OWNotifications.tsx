import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Bell, CheckCheck, AlertTriangle, Package, ShoppingBag,
  UserPlus, Zap, Trash2, RefreshCw, Info,
} from 'lucide-react';

interface Notification {
  id: string;
  tenant_id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  low_stock:    AlertTriangle,
  out_of_stock: Package,
  new_sale:     ShoppingBag,
  new_user:     UserPlus,
  system:       Zap,
  info:         Info,
};
const TYPE_COLOR: Record<string, string> = {
  low_stock:    '#D97706',
  out_of_stock: '#DC2626',
  new_sale:     '#2563EB',
  new_user:     '#7C3AED',
  system:       '#0F172A',
  info:         '#64748B',
};
const TYPE_BG: Record<string, string> = {
  low_stock:    '#FFFBEB',
  out_of_stock: '#FEF2F2',
  new_sale:     '#EFF6FF',
  new_user:     '#F5F3FF',
  system:       '#F8FAFC',
  info:         '#F8FAFC',
};

export default function OWNotifications() {
  const { appUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    let q = supabase.from('notifications').select('*')
      .eq('tenant_id', appUser.tenant_id)
      .order('created_at', { ascending: false })
      .limit(100);
    const { data } = await q;
    setNotifications(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [appUser?.tenant_id]);

  // Auto-generate low-stock notifications
  const checkLowStock = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    const { data: products } = await supabase.from('products').select('id, name, stock')
      .eq('tenant_id', appUser.tenant_id).lt('stock', 10);
    for (const p of (products ?? [])) {
      const type = p.stock === 0 ? 'out_of_stock' : 'low_stock';
      const title = p.stock === 0 ? `Out of Stock: ${p.name}` : `Low Stock: ${p.name}`;
      const message = p.stock === 0
        ? `${p.name} is completely out of stock. Restock immediately.`
        : `${p.name} has only ${p.stock} unit${p.stock !== 1 ? 's' : ''} remaining.`;
      // Upsert to avoid duplicates (one per product per day)
      await supabase.from('notifications').upsert({
        tenant_id: appUser.tenant_id,
        type,
        title,
        message,
        read: false,
      }, { onConflict: 'tenant_id,title' }).select();
    }
    load();
  }, [appUser?.tenant_id, load]);

  useEffect(() => {
    load();
    checkLowStock();
  }, [load, checkLowStock]);

  // Real-time subscription
  useEffect(() => {
    if (!appUser?.tenant_id) return;
    const channel = supabase.channel(`notifications:${appUser.tenant_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `tenant_id=eq.${appUser.tenant_id}`,
      }, payload => {
        const n = payload.new as Notification;
        setNotifications(prev => [n, ...prev]);
        toast(`🔔 ${n.title}`, { description: n.message, duration: 4000 });
      })
      .subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [appUser?.tenant_id]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!appUser?.tenant_id) return;
    await supabase.from('notifications').update({ read: true })
      .eq('tenant_id', appUser.tenant_id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = async () => {
    if (!appUser?.tenant_id || !confirm('Clear all notifications?')) return;
    await supabase.from('notifications').delete().eq('tenant_id', appUser.tenant_id);
    setNotifications([]);
    toast.success('All notifications cleared');
  };

  const displayed = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: '#DC2626' }}>
                  {unreadCount}
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Real-time alerts and system updates</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { load(); checkLowStock(); }}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4" /> Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll}
              className="h-9 px-4 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: notifications.length, color: '#2563EB' },
          { label: 'Unread', value: unreadCount, color: '#DC2626' },
          { label: 'Low Stock', value: notifications.filter(n => n.type === 'low_stock').length, color: '#D97706' },
          { label: 'Out of Stock', value: notifications.filter(n => n.type === 'out_of_stock').length, color: '#7C3AED' },
        ].map(k => (
          <Card key={k.label} className="border" style={{ background: '#ffffff', borderColor: '#E2E8F0' }}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{loading ? '–' : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`h-8 px-4 rounded-xl text-sm font-semibold capitalize transition-colors ${filter === f ? 'text-white' : 'text-slate-600 border border-slate-200 bg-white hover:bg-slate-50'}`}
            style={filter === f ? { background: '#2563EB' } : undefined}>
            {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border p-4" style={{ background: '#ffffff', borderColor: '#E2E8F0' }}>
            <Skeleton className="h-4 w-48 bg-slate-50 mb-2" />
            <Skeleton className="h-3 w-full bg-slate-50" />
          </div>
        )) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#EFF6FF' }}>
              <Bell className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-sm text-slate-400">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : displayed.map(n => {
          const Icon = TYPE_ICON[n.type] ?? Info;
          const color = TYPE_COLOR[n.type] ?? '#64748B';
          const bg = TYPE_BG[n.type] ?? '#F8FAFC';
          return (
            <div key={n.id}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${!n.read ? 'border-blue-100' : 'border-slate-100'}`}
              style={{ background: !n.read ? '#FAFBFF' : '#ffffff' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-semibold ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} title="Mark as read"
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                    )}
                    <button onClick={() => deleteNotif(n.id)} title="Delete"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className="text-xs border capitalize" style={{ background: bg, borderColor: color + '40', color }}>
                    {n.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
