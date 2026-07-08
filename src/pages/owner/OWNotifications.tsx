import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
interface Notif { id: string; title: string; message: string; type: string; read: boolean; created_at: string; }
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const TYPE_COLORS: Record<string,string> = { info:'bg-accent text-primary', warning:'bg-orange-100 text-orange-700', error:'bg-red-100 text-red-700', success:'bg-green-100 text-green-700', announcement:'bg-purple-100 text-purple-700' };
export default function OWNotifications() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<Notif[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase.from('notifications').select('id,title,message,type,read,created_at')
      .or(`tenant_id.eq.${appUser.tenant_id},tenant_id.is.null`)
      .order('created_at', { ascending: false }).limit(50);
    setItems((data ?? []) as Notif[]); setLoading(false);
  }, [appUser?.tenant_id]);
  useEffect(() => { load(); }, [load]);
  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('tenant_id', appUser?.tenant_id).eq('read', false);
    load();
  };
  const unread = items.filter(n=>!n.read).length;
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary"/><h1 className="text-xl font-bold text-foreground">Notifications</h1>{unread>0&&<Badge className="bg-accent text-primary">{unread} unread</Badge>}</div>
        {unread>0&&<Button variant="outline" size="sm" onClick={markAllRead} className="gap-1"><CheckCheck className="w-4 h-4"/>Mark all read</Button>}
      </div>
      <Card style={CARD}>
        <CardContent className="pt-4">
          {loading ? <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-16 w-full"/>)}</div>
          : items.length===0 ? <div className="text-center py-10 text-muted-foreground"><Bell className="w-8 h-8 mx-auto mb-2 opacity-30"/><p>No notifications.</p></div>
          : <div className="space-y-2">{items.map(n=>(
              <div key={n.id} className={`p-3 rounded-xl border ${n.read?'border-border bg-white':'border-primary bg-accent'}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[n.type]||'bg-secondary text-muted-foreground'}`}>{n.type}</span>
                  <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                  {!n.read&&<span className="w-2 h-2 rounded-full bg-accent0 ml-auto"/>}
                </div>
                <p className="font-medium text-foreground text-sm">{n.title}</p>
                {n.message&&<p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
              </div>
            ))}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
