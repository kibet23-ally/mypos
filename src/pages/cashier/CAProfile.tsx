import { useState } from 'react';
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
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
