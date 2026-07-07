/**
 * useSubscription — fetches the current tenant's subscription row,
 * computes trial days remaining, and exposes helpers.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: string;
  status: string; // 'trialing' | 'active' | 'expired' | 'cancelled'
  trial_start_date: string;
  trial_end_date: string;
  activated_at: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  amount: number | null;
  mpesa_phone: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { appUser } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!appUser?.tenant_id) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', appUser.tenant_id)
      .maybeSingle();
    setSubscription(data ?? null);
    setLoading(false);
  }, [appUser?.tenant_id]);

  useEffect(() => { load(); }, [load]);

  const trialDaysRemaining = (() => {
    if (!subscription || subscription.status === 'active') return null;
    const end = new Date(subscription.trial_end_date);
    const diff = Math.ceil((end.getTime() - Date.now()) / 86400000);
    return Math.max(0, diff);
  })();

  const isExpired =
    subscription != null &&
    subscription.status !== 'active' &&
    (trialDaysRemaining ?? 0) <= 0;

  const isActive =
    subscription?.status === 'active' ||
    (subscription?.status === 'trialing' && (trialDaysRemaining ?? 1) > 0);

  return { subscription, loading, trialDaysRemaining, isExpired, isActive, reload: load };
}
