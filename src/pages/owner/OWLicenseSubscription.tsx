import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import { Key, Crown, Calendar, CheckCircle, AlertTriangle, Clock, Zap } from 'lucide-react';

interface Plan { id: string; name: string; price: number; currency: string; interval: string; max_users: number; max_products: number; features: string[]; is_active: boolean; }
interface TenantInfo { id: string; business_name: string; plan: string; plan_expires_at?: string; suspended: boolean; suspension_reason?: string; }

const CARD = { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' };

function daysLeft(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

export default function OWLicenseSubscription() {
  const { appUser, refreshUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setLoading(true);
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from('subscription_plans').select('*').eq('is_active', true).order('price'),
      supabase.from('tenants').select('id,business_name,plan,plan_expires_at,suspended,suspension_reason').eq('id', appUser.tenant_id).single(),
    ]);
    setPlans((p ?? []) as Plan[]);
    if (t) setTenant(t as TenantInfo);
    setLoading(false);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);

  const days = daysLeft(tenant?.plan_expires_at);
  const isExpired = days !== null && days < 0;
  const isExpiringSoon = days !== null && days >= 0 && days <= 7;
  const isTrial = tenant?.plan === 'trial';

  const currentPlan = plans.find(p => p.name.toLowerCase() === tenant?.plan?.toLowerCase());

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Key className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">License & Subscription</h1>
      </div>

      {loading ? <div className="text-muted-foreground py-8 text-center">Loading subscription info…</div> : (
        <>
          {/* Status Banner */}
          {tenant?.suspended && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700">Account Suspended</p>
                <p className="text-sm text-red-600 mt-0.5">{tenant.suspension_reason || 'Your account has been suspended. Please contact support.'}</p>
              </div>
            </div>
          )}
          {!tenant?.suspended && isExpired && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700">Subscription Expired</p>
                <p className="text-sm text-red-600 mt-0.5">Your {isTrial ? 'trial' : 'subscription'} expired {Math.abs(days!)} day(s) ago. Please renew to continue.</p>
              </div>
            </div>
          )}
          {!tenant?.suspended && isExpiringSoon && !isExpired && (
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
              <Clock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-700">Expiring Soon</p>
                <p className="text-sm text-orange-600 mt-0.5">Your {isTrial ? 'trial' : 'subscription'} expires in <b>{days} day(s)</b>. Renew now to avoid interruption.</p>
              </div>
            </div>
          )}

          {/* Current Plan */}
          <Card style={CARD} className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-base text-foreground flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-500" />Current Plan</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-foreground capitalize">{tenant?.plan || 'Trial'}</p>
                    <Badge variant={tenant?.suspended ? 'destructive' : isExpired ? 'destructive' : isTrial ? 'secondary' : 'default'}>
                      {tenant?.suspended ? 'Suspended' : isExpired ? 'Expired' : isTrial ? 'Trial' : 'Active'}
                    </Badge>
                  </div>
                  {tenant?.plan_expires_at && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {isExpired ? 'Expired on' : 'Expires on'}: {new Date(tenant.plan_expires_at).toLocaleDateString()}
                      {days !== null && !isExpired && <span className="text-orange-500 font-medium ml-1">({days} days left)</span>}
                    </p>
                  )}
                  {currentPlan && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(Array.isArray(currentPlan.features) ? currentPlan.features : []).map((f, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-accent text-primary font-medium">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-left md:text-right shrink-0">
                  {currentPlan ? (
                    <p className="text-3xl font-bold text-primary">{fmt(currentPlan.price)}<span className="text-sm font-normal text-muted-foreground">/{currentPlan.interval}</span></p>
                  ) : (
                    <p className="text-lg font-bold text-green-600">FREE TRIAL</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">Available Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plans.map(p => {
                const isCurrentPlan = tenant?.plan?.toLowerCase() === p.name.toLowerCase();
                const features = Array.isArray(p.features) ? p.features : [];
                return (
                  <Card key={p.id} style={CARD} className={`rounded-2xl transition-all ${isCurrentPlan ? 'border-primary ring-2 ring-primary' : 'hover:border-border'}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-foreground">{p.name}</h3>
                        {isCurrentPlan && <Badge className="bg-accent text-primary border-primary">Current</Badge>}
                      </div>
                      <p className="text-2xl font-bold text-primary mb-1">{fmt(p.price)}<span className="text-sm font-normal text-muted-foreground">/{p.interval}</span></p>
                      <p className="text-xs text-muted-foreground mb-3">Up to {p.max_users} users · {p.max_products ? p.max_products + ' products' : 'Unlimited products'}</p>
                      <ul className="space-y-1 mb-4">
                        {features.map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle className="w-3 h-3 text-green-500 shrink-0" />{f}</li>
                        ))}
                      </ul>
                      {!isCurrentPlan && (
                        <Button className="w-full bg-primary hover:opacity-90 text-white" size="sm" onClick={() => toast.info(`Contact your administrator to upgrade to ${p.name}.`)}>
                          <Zap className="w-3.5 h-3.5 mr-1" />Upgrade to {p.name}
                        </Button>
                      )}
                      {isCurrentPlan && <Button variant="outline" className="w-full" size="sm" disabled onClick={() => {}}>Current Plan</Button>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card style={CARD} className="rounded-2xl">
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">To manage licensing, activate a license key, or upgrade your plan, please contact your system administrator or visit the billing portal.</p>
              <p className="text-xs text-muted-foreground mt-1">Super admins can manage all tenant subscriptions from the Admin Panel → Licenses section.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
