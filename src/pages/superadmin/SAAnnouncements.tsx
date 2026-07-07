import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
interface Announcement { id: string; title: string; message: string; priority: string; created_at: string; }
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
const inp = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const PRI_COLORS: Record<string,string> = { low:'bg-slate-100 text-slate-600', normal:'bg-blue-100 text-blue-700', high:'bg-orange-100 text-orange-700', critical:'bg-red-100 text-red-700' };
export default function SAAnnouncements() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]); const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', priority: 'normal' });
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('id,title,message,priority,created_at').is('tenant_id', null).order('created_at', { ascending: false }).limit(50);
    setItems((data ?? []) as Announcement[]); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    const { error } = await supabase.from('notifications').insert({ title: form.title, message: form.message, priority: form.priority, user_id: appUser?.id, type: 'announcement' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Announcement sent'); setOpen(false); setForm({ title:'', message:'', priority:'normal' }); load();
  };
  const del = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    toast.success('Deleted'); load();
  };
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-blue-600"/><h1 className="text-xl font-bold text-slate-800">Announcements</h1></div>
        <Button onClick={()=>setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-9 gap-1"><Plus className="w-4 h-4"/>New Announcement</Button>
      </div>
      <Card style={CARD}>
        <CardContent className="pt-4">
          {loading ? <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-16 w-full"/>)}</div>
          : items.length===0 ? <p className="text-center py-8 text-slate-400">No announcements yet.</p>
          : <div className="space-y-2">{items.map(a=>(
              <div key={a.id} className="flex items-start justify-between gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800 text-sm">{a.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRI_COLORS[a.priority]||'bg-slate-100 text-slate-600'}`}>{a.priority}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{a.message}</p>
                  <p className="text-xs text-slate-300 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <button onClick={()=>del(a.id)} className="p-1 hover:bg-red-50 rounded text-red-400 shrink-0"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}</div>}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Title</Label><Input className={inp} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Announcement title"/></div>
            <div><Label>Message</Label><Textarea className="bg-slate-50 border-slate-200 rounded-xl" rows={4} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Full announcement text…"/></div>
            <div><Label>Priority</Label>
              <select className={`w-full ${inp}`} value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                {['low','normal','high','critical'].map(p=><option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} disabled={saving}>{saving?'Sending…':'Send'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
