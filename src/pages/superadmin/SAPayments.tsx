import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/useCurrency';
import { DollarSign } from 'lucide-react';
interface Inv { id: string; invoice_number: string; total: number; amount_paid: number; status: string; created_at: string; }
const CARD = { background: '#ffffff', borderColor: '#E2E8F0' };
export default function SAPayments() {
  const { format: fmt } = useCurrency();
  const [items, setItems] = useState<Inv[]>([]); const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total: 0, paid: 0 });
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('invoices').select('id,invoice_number,total,amount_paid,status,created_at').order('created_at', { ascending: false }).limit(50);
      const d = data ?? [];
      setItems(d as Inv[]);
      setTotals({ total: d.reduce((s,i)=>s+(i.total||0),0), paid: d.reduce((s,i)=>s+(i.amount_paid||0),0) });
      setLoading(false);
    })();
  }, []);
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2"><DollarSign className="w-5 h-5 text-blue-600"/><h1 className="text-xl font-bold text-slate-800">Payments Overview</h1></div>
      <div className="grid grid-cols-2 gap-3">
        <Card style={CARD} className="rounded-2xl"><CardContent className="pt-4 pb-3"><p className="text-xs text-slate-400">Total Invoiced</p><p className="text-xl font-bold text-blue-700">{fmt(totals.total)}</p></CardContent></Card>
        <Card style={CARD} className="rounded-2xl"><CardContent className="pt-4 pb-3"><p className="text-xs text-slate-400">Total Collected</p><p className="text-xl font-bold text-green-700">{fmt(totals.paid)}</p></CardContent></Card>
      </div>
      <Card style={CARD}>
        <CardContent className="pt-4 overflow-x-auto">
          {loading ? <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
          : <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b border-slate-100">{['Invoice','Total','Paid','Status','Date'].map(h=><th key={h} className="text-left py-2 px-3 font-semibold text-slate-600">{h}</th>)}</tr></thead>
              <tbody>{items.map(i=>(
                <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono text-blue-700">{i.invoice_number}</td>
                  <td className="py-2 px-3 font-semibold">{fmt(i.total)}</td>
                  <td className="py-2 px-3 text-green-700">{fmt(i.amount_paid)}</td>
                  <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 text-slate-600">{i.status}</span></td>
                  <td className="py-2 px-3 text-slate-400 text-xs">{new Date(i.created_at).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>}
        </CardContent>
      </Card>
    </div>
  );
}
