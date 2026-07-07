import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Shield, Clock, HardDrive } from 'lucide-react';
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
export default function SABackupRestore() {
  const info = [
    { icon: Clock, title: 'Automated Backups', desc: 'Supabase performs automated daily backups of your PostgreSQL database. Backups are retained for 7 days on the free plan and 30+ days on Pro plans.' },
    { icon: Shield, title: 'Point-in-Time Recovery', desc: 'Pro and Enterprise plans support Point-in-Time Recovery (PITR), allowing you to restore your database to any specific second within the retention window.' },
    { icon: HardDrive, title: 'Manual Backup', desc: 'You can trigger a manual backup from the Supabase Dashboard → Settings → Database → Backups. Downloads are available in .dump format.' },
    { icon: Database, title: 'Restore Process', desc: 'To restore, navigate to the Supabase Dashboard → Backups. Select the backup you want and click "Restore". This will replace the current database state.' },
  ];
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2"><Database className="w-5 h-5 text-blue-600"/><h1 className="text-xl font-bold text-slate-800">Backup & Restore</h1></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {info.map(i => (
          <Card key={i.title} style={CARD} className="rounded-2xl">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center"><i.icon className="w-4 h-4 text-blue-600"/></div><h3 className="font-semibold text-slate-800">{i.title}</h3></div>
              <p className="text-sm text-slate-500">{i.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card style={CARD}>
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-slate-500">For direct database management, access the <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">Supabase Dashboard</a> with your project credentials.</p>
        </CardContent>
      </Card>
    </div>
  );
}
