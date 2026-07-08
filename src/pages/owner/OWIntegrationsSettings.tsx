import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Smartphone, MessageSquare, CreditCard, Truck, BarChart3, ExternalLink } from 'lucide-react';
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
const integrations = [
  { icon: Smartphone, title: 'M-Pesa', desc: 'Accept mobile payments via Safaricom M-Pesa. Configure your Business Shortcode (Paybill/Till) and API credentials in Super Admin settings.', status: 'available', color: 'text-green-600', bg: 'bg-green-50' },
  { icon: CreditCard, title: 'Card Payments', desc: 'Accept Visa/Mastercard via your POS terminal. Card transactions are recorded automatically on every sale.', status: 'built-in', color: 'text-primary', bg: 'bg-accent' },
  { icon: MessageSquare, title: 'SMS Notifications', desc: 'Send receipts and payment reminders to customers via SMS. Configure your SMS gateway in Super Admin → SMS Settings.', status: 'available', color: 'text-purple-600', bg: 'bg-purple-50' },
  { icon: MessageSquare, title: 'WhatsApp Receipts', desc: 'Send digital receipts via WhatsApp Business API. Requires WhatsApp Business API token configured by Super Admin.', status: 'available', color: 'text-green-700', bg: 'bg-green-50' },
  { icon: BarChart3, title: 'Google Analytics', desc: 'Track usage patterns and performance. Contact Super Admin to enable analytics integration for your account.', status: 'contact-admin', color: 'text-orange-600', bg: 'bg-orange-50' },
  { icon: Truck, title: 'Delivery / Logistics', desc: 'Integration with local courier and logistics providers coming soon.', status: 'coming-soon', color: 'text-muted-foreground', bg: 'bg-card' },
];
const STATUS_LABELS: Record<string,{label:string;cls:string}> = {
  'available':     { label: 'Available', cls: 'bg-green-100 text-green-700' },
  'built-in':      { label: 'Built-in', cls: 'bg-accent text-primary' },
  'contact-admin': { label: 'Contact Admin', cls: 'bg-orange-100 text-orange-700' },
  'coming-soon':   { label: 'Coming Soon', cls: 'bg-secondary text-muted-foreground' },
};
export default function OWIntegrationsSettings() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2"><Globe className="w-5 h-5 text-primary"/><h1 className="text-xl font-bold text-foreground">Integrations</h1></div>
      <p className="text-sm text-muted-foreground">Connect PosifyPro with external services and payment gateways. Contact your Super Admin to enable payment or messaging integrations.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map(item => {
          const s = STATUS_LABELS[item.status];
          return (
            <Card key={item.title} style={CARD} className="rounded-2xl">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
