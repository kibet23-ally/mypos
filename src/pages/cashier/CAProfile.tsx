import { useState } from 'react';
<<<<<<< HEAD
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { User, Clock, TrendingUp, Star, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const weeklyPerf = [
  { day: 'Mon', txn: 42 }, { day: 'Tue', txn: 38 }, { day: 'Wed', txn: 51 },
  { day: 'Thu', txn: 44 }, { day: 'Fri', txn: 67 }, { day: 'Sat', txn: 78 }, { day: 'Sun', txn: 47 },
];

export default function CAProfile() {
  const { appUser } = useAuth();
  const [clocked, setClocked] = useState(true);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const toggleClock = () => {
    setClocked(v => !v);
    toast.success(clocked ? 'Clocked out — have a good shift!' : 'Clocked in — good luck today!');
  };

  const changePwd = () => {
    if (!currentPwd || !newPwd || !confirmPwd) { toast.error('Fill in all password fields'); return; }
    if (newPwd !== confirmPwd) { toast.error('New passwords do not match'); return; }
    if (newPwd.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    toast.success('Password changed successfully');
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Your personal information and shift management</p>
      </div>

      {/* Profile card */}
      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-primary-foreground">
                {appUser?.username?.slice(0, 2).toUpperCase() || 'CA'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground">{appUser?.username || 'Cashier'}</p>
              <p className="text-sm text-muted-foreground capitalize">{appUser?.role || 'cashier'} · {appUser?.tenant?.business_name || 'Your Business'}</p>
            </div>
            <Button className="shrink-0 h-10 gap-2 font-medium" variant={clocked ? 'outline' : 'default'} onClick={toggleClock}>
              <Clock className="w-4 h-4" />
              {clocked ? 'Clock Out' : 'Clock In'}
            </Button>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              { label: 'Shift Status', value: clocked ? 'Active' : 'Off Shift', icon: Clock, cls: clocked ? 'text-[hsl(var(--success))]' : 'text-muted-foreground' },
              { label: 'Transactions Today', value: '47', icon: TrendingUp, cls: 'text-foreground' },
              { label: 'Performance Score', value: '96 / 100', icon: Star, cls: 'text-foreground' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded border border-border bg-muted/10">
                <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center shrink-0">
                  <s.icon className={`w-4 h-4 ${s.cls}`} />
                </div>
                <div>
                  <p className={`text-base font-bold ${s.cls}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
=======
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Eye, EyeOff, Shield } from 'lucide-react';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const inputClass = "h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3";

export default function CAProfile() {
  const { appUser } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw || newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) { toast.error(error.message); } else {
      toast.success('Password updated'); setCurrentPw(''); setNewPw(''); setConfirmPw('');
    }
  };

  const displayName = appUser?.display_name || appUser?.email?.split('@')[0] || 'Cashier';
  const email = appUser?.email || '';
  const phone = appUser?.phone_number || '';
  const joined = '–';

  return (
    <div className="space-y-5 fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 text-balance">My Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your account settings</p>
      </div>

      <Card className="border" style={CARD_STYLE}>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-slate-900 shrink-0"
              style={{ background: '#2563EB' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900 truncate">{displayName}</h3>
              <p className="text-sm text-slate-500 truncate">{email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="text-xs border" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#D97706' }}>
                  Cashier
                </Badge>
                <span className="text-xs text-slate-400">Joined {joined}</span>
              </div>
            </div>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
          </div>
        </CardContent>
      </Card>

<<<<<<< HEAD
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Weekly performance */}
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-balance">Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyPerf} barSize={28}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Transactions']} />
                  <Bar dataKey="txn" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card className="border border-border h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-balance">
              <User className="w-4 h-4" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Current Password</Label>
              <Input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} className="px-3 h-9" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">New Password</Label>
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="px-3 h-9" placeholder="Min. 8 characters" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Confirm New Password</Label>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="px-3 h-9" placeholder="••••••••" />
            </div>
            <Button className="w-full h-9 font-medium gap-2" onClick={changePwd}>
              <Save className="w-4 h-4" /> Update Password
            </Button>
          </CardContent>
        </Card>
      </div>
=======
      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 text-balance">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#EFF6FF', border: '1px solid rgba(37,99,235,0.3)' }}>
              <User className="w-3.5 h-3.5 text-blue-500" />
            </div>
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Display Name</Label>
            <Input value={displayName} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Email</Label>
            <Input value={email} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Phone Number</Label>
            <Input value={phone || '—'} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Role</Label>
              <Input value="Cashier" readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Member Since</Label>
              <Input value={joined} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 text-balance">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <form onSubmit={changePw} className="space-y-4">
            {[
              { label: 'Current Password', val: currentPw, set: setCurrentPw, placeholder: '••••••••' },
              { label: 'New Password', val: newPw, set: setNewPw, placeholder: 'Min 8 characters' },
              { label: 'Confirm New Password', val: confirmPw, set: setConfirmPw, placeholder: 'Repeat new password' },
            ].map((f, i) => (
              <div key={i}>
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{f.label}</Label>
                <div className="relative">
                  <Input type={showPw ? 'text' : 'password'} placeholder={f.placeholder} value={f.val}
                    onChange={e => f.set(e.target.value)} className={`${inputClass} pr-10`} />
                  {i === 0 && (
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="submit" disabled={saving}
              className="h-10 px-6 rounded-xl text-sm font-semibold text-slate-900 disabled:opacity-60"
              style={{ background: '#2563EB' }}>
              {saving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </CardContent>
      </Card>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
    </div>
  );
}
