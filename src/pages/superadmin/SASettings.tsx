import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Shield, Bell, Database } from 'lucide-react';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const inputClass = "h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3";

export default function SASettings() {
  const [email, setEmail] = useState('admin@posifypro.com');
  const [notifications, setNotifications] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);

  const sections = [
    {
      title: 'Platform Settings', icon: Settings, color: '#2563EB',
      content: (
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Admin Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-900">Maintenance Mode</p>
              <p className="text-xs text-slate-400 mt-0.5">Temporarily disable platform access</p>
            </div>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </div>
        </div>
      ),
    },
    {
      title: 'Notifications', icon: Bell, color: '#D97706',
      content: (
        <div className="space-y-4">
          {[
            { label: 'New Tenant Alerts', desc: 'Get notified when a new business registers' },
            { label: 'Revenue Milestones', desc: 'Alerts at 10%, 25%, 50% MoM growth' },
            { label: 'System Alerts', desc: 'Critical infrastructure notifications' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>
              <Switch defaultChecked={notifications} />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Security', icon: Shield, color: '#16A34A',
      content: (
        <div className="space-y-4">
          {[
            { label: 'Two-Factor Authentication', desc: 'Require 2FA for all admin logins', val: true },
            { label: 'IP Allowlisting', desc: 'Restrict admin access by IP address', val: false },
            { label: 'Session Timeout', desc: 'Auto-logout after 30 minutes of inactivity', val: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>
              <Switch defaultChecked={item.val} />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Data & Backup', icon: Database, color: '#7C3AED',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-900">Auto Backup</p>
              <p className="text-xs text-slate-400 mt-0.5">Daily automated database backups</p>
            </div>
            <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
          </div>
          <p className="text-xs text-slate-400">Last backup: Today at 03:00 UTC</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 text-balance">Platform Settings</h2>
          <p className="text-sm text-slate-500 mt-1">System-wide configuration</p>
        </div>
        <button onClick={() => toast.success('Settings saved')}
          className="h-10 px-5 rounded-xl text-sm font-semibold text-slate-900 transition-opacity hover:opacity-90"
          style={{ background: '#2563EB' }}>
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sections.map(s => (
          <Card key={s.title} className="border h-full" style={CARD_STYLE}>
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 text-balance">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                  <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </div>
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">{s.content}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
