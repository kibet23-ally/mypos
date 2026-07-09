import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { History, DollarSign, ShoppingBag, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';

interface Txn { id: string; time: string; items: number; amount: number; method: 'Cash' | 'Card' | 'Mobile'; status: 'completed' | 'refunded'; }

const TXNS: Txn[] = [
  { id: 'TXN-0847', time: '12:44 PM', items: 3, amount: 1850, method: 'Card',   status: 'completed' },
  { id: 'TXN-0846', time: '12:31 PM', items: 1, amount: 550,  method: 'Mobile', status: 'completed' },
  { id: 'TXN-0845', time: '12:18 PM', items: 2, amount: 950,  method: 'Cash',   status: 'completed' },
  { id: 'TXN-0844', time: '11:59 AM', items: 5, amount: 3100, method: 'Card',   status: 'completed' },
  { id: 'TXN-0843', time: '11:42 AM', items: 1, amount: 350,  method: 'Cash',   status: 'refunded' },
  { id: 'TXN-0842', time: '11:27 AM', items: 2, amount: 1150, method: 'Card',   status: 'completed' },
  { id: 'TXN-0841', time: '11:10 AM', items: 4, amount: 2400, method: 'Mobile', status: 'completed' },
  { id: 'TXN-0840', time: '10:55 AM', items: 1, amount: 400,  method: 'Cash',   status: 'completed' },
];

const hourChart = [
  { h: '8am', rev: 4800 }, { h: '9am', rev: 7200 }, { h: '10am', rev: 9600 },
  { h: '11am', rev: 12400 }, { h: '12pm', rev: 18800 }, { h: '1pm', rev: 10900 },
];

const METHOD_ICON = { Cash: Banknote, Card: CreditCard, Mobile: Smartphone };
const STATUS_CFG = {
  completed: { cls: 'bg-[hsl(152_76%_94%)] text-[hsl(152_76%_25%)]', label: 'Completed' },
  refunded:  { cls: 'bg-[hsl(0_72%_94%)] text-[hsl(0_72%_35%)]',     label: 'Refunded' },
};

export default function CASalesHistory() {
  const { appUser } = useAuth();
  const cc = appUser?.currency_code ?? 'KES';

  const total = TXNS.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">Sales History</h2>
        <p className="text-sm text-muted-foreground mt-1">Your transactions for today's shift</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Transactions Today', value: TXNS.filter(t => t.status === 'completed').length, icon: ShoppingBag },
          { label: 'Total Revenue',      value: formatCurrency(total, cc),                         icon: DollarSign },
          { label: 'Refunds',            value: TXNS.filter(t => t.status === 'refunded').length,  icon: History },
        ].map(s => (
          <Card key={s.label} className="border border-border h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">Revenue by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourChart} barSize={28}>
                <XAxis dataKey="h" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v, cc)} />
                <Tooltip formatter={(v: number) => [formatCurrency(v, cc), 'Revenue']} />
                <Bar dataKey="rev" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-balance">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['ID', 'Time', 'Items', 'Amount', 'Method', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TXNS.map((t, i) => {
                  const Icon = METHOD_ICON[t.method];
                  const cfg = STATUS_CFG[t.status];
                  return (
                    <tr key={t.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-6 py-3 text-xs text-muted-foreground font-mono">{t.id}</td>
                      <td className="px-6 py-3 text-sm text-foreground">{t.time}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{t.items}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-foreground">{formatCurrency(t.amount, cc)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Icon className="w-4 h-4 shrink-0" />{t.method}
                        </div>
                      </td>
                      <td className="px-6 py-3"><Badge variant="secondary" className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
