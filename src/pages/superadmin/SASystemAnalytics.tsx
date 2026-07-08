import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Users, Database, Activity } from 'lucide-react';
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
export default function SASystemAnalytics() {
  const [stats, setStats] = useState({ tenants: 0, users: 0, sales: 0, products: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const [t, u, s, p] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('sales').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);
      setStats({ tenants: t.count??0, users: u.count??0, sales: s.count??0, products: p.count??0 });
      setLoading(false);
    })();
  }, []);
  const items = [
    { label: 'Total Tenants', value: stats.tenants, icon: Database, color: 'text-primary' },
    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-purple-700' },
    { label: 'Total Sales', value: stats.sales, icon: Activity, color: 'text-green-700' },
    { label: 'Total Products', value: stats.products, icon: BarChart3, color: 'text-orange-600' },
  ];
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary"/><h1 className="text-xl font-bold text-foreground">System Analytics</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading ? Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-2xl"/>) :
        items.map(s => (
          <Card key={s.label} style={CARD} className="rounded-2xl">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1"><s.icon className={`w-4 h-4 ${s.color}`}/><p className="text-xs text-muted-foreground">{s.label}</p></div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
