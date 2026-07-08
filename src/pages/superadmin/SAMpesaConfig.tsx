import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };
export default function SAMpesaConfig() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary"/><h1 className="text-xl font-bold text-foreground">MpesaConfig</h1></div>
      <Card style={CARD} className="rounded-2xl">
        <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-30"/>
          <p className="font-medium text-muted-foreground mb-1">MpesaConfig Configuration</p>
          <p className="text-sm">Configure your MpesaConfig settings here. Contact your system administrator for API credentials and integration details.</p>
        </CardContent>
      </Card>
    </div>
  );
}
