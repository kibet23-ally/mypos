import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShoppingCart, Key, CheckCircle, Copy, Loader2, LogOut } from 'lucide-react';

export default function ActivatePage() {
  const { appUser, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [paymentRef, setPaymentRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const licenseKey = appUser?.tenant?.license_key || '';

  useEffect(() => {
    if (appUser?.tenant?.is_activated) {
      navigate('/dashboard', { replace: true });
    }
  }, [appUser, navigate]);

  const handleCopy = async () => {
    if (!licenseKey) return;
    await navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRef.trim()) {
      toast.error('Please enter a payment reference');
      return;
    }
    if (!appUser?.tenant_id) {
      toast.error('No tenant associated with your account');
      return;
    }

    setLoading(true);
    try {
      // Record payment license entry
      const { error: licErr } = await supabase
        .from('payment_licenses')
        .insert({
          tenant_id: appUser.tenant_id,
          license_key: licenseKey,
          payment_reference: paymentRef.trim(),
          amount: 299.00,
          status: 'active',
          paid_at: new Date().toISOString(),
          notes: 'One-time license activation',
        });

      if (licErr) throw licErr;

      // Activate tenant
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({ is_activated: true, activated_at: new Date().toISOString() })
        .eq('id', appUser.tenant_id);

      if (tenantErr) throw tenantErr;

      await refreshUser();
      toast.success('License activated! Welcome to PosifyPro.');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Activation failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-primary flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">PosifyPro</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-2"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>

        <Card className="border border-border shadow-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                <Key className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-balance">License Activation</CardTitle>
                <p className="text-sm text-muted-foreground text-pretty">One-time payment required to unlock your dashboard</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Business info */}
            {appUser?.tenant && (
              <div className="p-4 bg-muted rounded border border-border">
                <p className="text-xs text-muted-foreground mb-1">Business Account</p>
                <p className="font-semibold text-foreground">{appUser.tenant.business_name}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {appUser.role}
                </Badge>
              </div>
            )}

            {/* License key */}
            <div className="space-y-2">
              <Label className="text-sm font-normal text-muted-foreground">Your License Key</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 bg-secondary rounded border border-border font-mono text-sm text-foreground truncate">
                  {licenseKey || 'Loading...'}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-9 gap-1.5"
                  onClick={handleCopy}
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key when completing your payment at checkout.
              </p>
            </div>

            {/* Payment steps */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">How to activate</p>
              {[
                { step: '1', text: 'Copy your License Key above' },
                { step: '2', text: 'Complete the one-time payment of $299 via your preferred method' },
                { step: '3', text: 'Enter the payment reference number below to activate' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>

            {/* Activation form */}
            <form onSubmit={handleActivate} className="space-y-4 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label htmlFor="payment-ref" className="text-sm font-normal">Payment Reference Number</Label>
                <Input
                  id="payment-ref"
                  type="text"
                  placeholder="e.g. TXN-2026-XXXXXXXX"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="px-3 font-mono"
                />
              </div>
              <Button type="submit" className="w-full font-semibold h-10" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Activate License
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Need help? Contact{' '}
          <span className="text-foreground underline underline-offset-2 cursor-pointer">support@posifypro.com</span>
        </p>
      </div>
    </div>
  );
}
