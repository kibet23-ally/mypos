/**
 * SubscriptionGuard
 * Wraps protected dashboard content.
 * – Shows a trial banner when trialing with days remaining.
 * – Blocks with a full-page paywall when trial has expired (and not active).
 * – Superadmin is always allowed through.
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/db/supabase';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Zap, Clock, CreditCard, Smartphone } from 'lucide-react';

interface Props { children: React.ReactNode; }

export function SubscriptionGuard({ children }: Props) {
  const { appUser } = useAuth();
  const { subscription, loading, trialDaysRemaining, isExpired, isActive, reload } = useSubscription();

  // Superadmin + cashiers (no tenant owner) skip the guard
  if (appUser?.role === 'superadmin' || appUser?.role === 'cashier') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  // Full paywall for expired trials
  if (isExpired) {
    return <PaywallScreen tenantId={appUser?.tenant_id ?? ''} onActivated={reload} />;
  }

  return (
    <>
      {/* Trial banner */}
      {subscription?.status === 'trialing' && trialDaysRemaining !== null && isActive && (
        <TrialBanner daysLeft={trialDaysRemaining} tenantId={appUser?.tenant_id ?? ''} onActivated={reload} />
      )}
      {children}
    </>
  );
}

// ─── Trial Banner ─────────────────────────────────────────────────────────────
function TrialBanner({ daysLeft, tenantId, onActivated }: { daysLeft: number; tenantId: string; onActivated: () => void }) {
  const [open, setOpen] = useState(false);
  const urgency = daysLeft <= 3;

  return (
    <div
      className="w-full rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between gap-3 flex-wrap text-sm"
      style={{
        background: urgency ? '#FFF7ED' : '#EFF6FF',
        borderColor: urgency ? '#FED7AA' : '#BFDBFE',
        border: '1px solid',
      }}
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 shrink-0" style={{ color: urgency ? '#EA580C' : '#2563EB' }} />
        <span style={{ color: urgency ? '#9A3412' : '#1D4ED8' }} className="font-medium">
          {daysLeft === 0
            ? 'Your free trial expires today.'
            : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial.`}
        </span>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 h-7 px-3 rounded-lg text-xs font-semibold text-white transition-colors"
        style={{ background: urgency ? '#EA580C' : '#2563EB' }}
      >
        Activate now
      </button>
      {open && <PaymentModal tenantId={tenantId} onSuccess={() => { setOpen(false); onActivated(); }} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ─── Paywall Screen ───────────────────────────────────────────────────────────
function PaywallScreen({ tenantId, onActivated }: { tenantId: string; onActivated: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'hsl(var(--accent))', border: '1px solid #BFDBFE' }}>
        <CreditCard className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2 text-balance">Your free trial has ended</h2>
      <p className="text-muted-foreground mb-6 max-w-sm text-pretty">
        Activate your subscription to keep access to PosifyPro — POS, reports, staff management, and more.
      </p>
      <div className="bg-white border border-border rounded-2xl p-6 max-w-xs w-full mb-6 text-left space-y-3">
        {[
          'Unlimited sales & receipts',
          'Product inventory management',
          'Detailed sales reports',
          'Staff (cashier) accounts',
          'M-Pesa payment integration',
        ].map(f => (
          <div key={f} className="flex items-center gap-2 text-sm text-foreground">
            <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-xs"
              style={{ background: '#DCFCE7', color: '#16A34A' }}>✓</span>
            {f}
          </div>
        ))}
      </div>
      <button
        onClick={() => setOpen(true)}
        className="h-11 px-8 rounded-xl text-sm font-bold text-white"
        style={{ background: 'hsl(var(--primary))' }}
      >
        Activate Subscription
      </button>
      <p className="text-xs text-muted-foreground mt-3">One-time payment • Lifetime access</p>
      {open && <PaymentModal tenantId={tenantId} onSuccess={() => { setOpen(false); onActivated(); }} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({ tenantId, onSuccess, onClose }: { tenantId: string; onSuccess: () => void; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const AMOUNT = 2999; // KES

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error('Enter your M-Pesa phone number'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initiate-payment', {
        body: { tenant_id: tenantId, phone: phone.trim(), amount: AMOUNT },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.mock) {
        toast.success('Subscription activated! (Demo mode)');
        onSuccess();
      } else {
        toast.success('STK push sent! Check your phone to complete payment.');
        // Poll for activation (up to 60s)
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('tenant_id', tenantId)
            .maybeSingle();
          if (sub?.status === 'active') {
            clearInterval(poll);
            toast.success('Payment confirmed! Subscription activated.');
            onSuccess();
          } else if (attempts >= 12) {
            clearInterval(poll);
            toast.info('Payment pending. Please refresh once you complete M-Pesa payment.');
            onClose();
          }
        }, 5000);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-border shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--accent))' }}>
            <Smartphone className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Activate via M-Pesa</h3>
            <p className="text-xs text-muted-foreground">One-time payment of KES {AMOUNT.toLocaleString()}</p>
          </div>
        </div>

        <form onSubmit={handlePay} className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">M-Pesa Phone Number</Label>
            <Input
              placeholder="e.g. 0712345678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="h-11 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl"
            />
            <p className="text-xs text-muted-foreground mt-1">You will receive an STK push on this number.</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge className="text-xs border" style={{ background: 'hsl(var(--accent))', borderColor: 'hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))' }}>
                <Zap className="w-3 h-3 mr-1" /> Starter — Lifetime
              </Badge>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-1.5">
              <span className="text-foreground">Total</span>
              <span className="text-primary">KES {AMOUNT.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-11 rounded-xl text-sm font-semibold text-muted-foreground border border-border hover:bg-card transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
              style={{ background: 'hsl(var(--primary))' }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Sending…' : 'Pay via M-Pesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
