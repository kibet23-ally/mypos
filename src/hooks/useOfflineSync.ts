/**
 * useOfflineSync.ts
 *
 * Manages:
 *  1. Online / offline status detection
 *  2. Product + category cache refresh (when online)
 *  3. Pending-sale sync to Supabase (idempotent via local_id dedup)
 *  4. Pending sale count badge
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import {
  openDB,
  getPendingSalesByTenant,
  updatePendingSale,
  deletePendingSale,
  cacheProducts,
  cacheCategories,
  countPendingSales,
  type CachedProduct,
  type CachedCategory,
  type PendingSale,
} from '@/db/offlineDB';
import { toast } from 'sonner';

const MAX_RETRIES = 3;

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  refreshCache: (tenantId: string) => Promise<void>;
}

export function useOfflineSync(tenantId: string | null): OfflineSyncState {
  const [isOnline, setIsOnline]       = useState<boolean>(navigator.onLine);
  const [pendingCount, setPending]    = useState<number>(0);
  const [isSyncing, setIsSyncing]     = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt]   = useState<Date | null>(null);
  const syncLockRef                   = useRef<boolean>(false);

  // ── Connectivity detection ───────────────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Refresh pending count ────────────────────────────────────────────────
  const refreshCount = useCallback(async () => {
    if (!tenantId) return;
    await openDB();
    const n = await countPendingSales(tenantId);
    setPending(n);
  }, [tenantId]);

  // Refresh count on mount and whenever online state changes
  useEffect(() => { refreshCount(); }, [refreshCount, isOnline]);

  // ── Cache refresh (products + categories) ────────────────────────────────
  const refreshCache = useCallback(async (tid: string) => {
    try {
      const now = Date.now();

      const [{ data: products }, { data: categories }] = await Promise.all([
        supabase
          .from('products')
          .select('id,tenant_id,name,sku,barcode,price,cost_price,tax_rate,unit,category_id,is_active,is_available')
          .eq('tenant_id', tid)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('categories')
          .select('id,tenant_id,name,sort_order,is_active')
          .eq('tenant_id', tid)
          .eq('is_active', true)
          .order('sort_order'),
      ]);

      // Build category name map
      const catMap: Record<string, string> = {};
      if (categories) {
        for (const c of categories) catMap[c.id] = c.name;
        const cachedCats: CachedCategory[] = categories.map(c => ({ ...c, cached_at: now }));
        await cacheCategories(cachedCats);
      }

      if (products) {
        const cachedProds: CachedProduct[] = products.map(p => ({
          ...p,
          category_name: p.category_id ? (catMap[p.category_id] ?? '') : '',
          cached_at: now,
        }));
        await cacheProducts(cachedProds);
      }
    } catch (err) {
      console.warn('[offlineSync] Cache refresh failed:', err);
    }
  }, []);

  // ── Auto-refresh cache when coming online ────────────────────────────────
  useEffect(() => {
    if (isOnline && tenantId) {
      refreshCache(tenantId);
    }
  }, [isOnline, tenantId, refreshCache]);

  // ── Sync pending sales when online ───────────────────────────────────────
  const syncPendingSales = useCallback(async () => {
    if (!tenantId || !isOnline || syncLockRef.current) return;
    syncLockRef.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingSalesByTenant(tenantId);
      const toSync  = pending.filter(s => (s.status === 'pending' || s.status === 'failed') && s.retry_count < MAX_RETRIES);

      if (toSync.length === 0) return;

      let syncedCount = 0;
      let failedCount = 0;

      for (const sale of toSync) {
        try {
          await syncOneSale(sale);
          await deletePendingSale(sale.local_id);
          syncedCount++;
        } catch (err) {
          const updated: PendingSale = {
            ...sale,
            status: sale.retry_count + 1 >= MAX_RETRIES ? 'failed' : 'pending',
            retry_count: sale.retry_count + 1,
            last_attempt_at: new Date().toISOString(),
            error_message: err instanceof Error ? err.message : 'Unknown error',
          };
          await updatePendingSale(updated);
          failedCount++;
        }
      }

      if (syncedCount > 0) {
        toast.success(`${syncedCount} offline sale${syncedCount > 1 ? 's' : ''} synced ✓`);
        setLastSyncAt(new Date());
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} sale${failedCount > 1 ? 's' : ''} failed to sync`);
      }
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
      await refreshCount();
    }
  }, [tenantId, isOnline, refreshCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      // Small delay to let network stabilise
      const t = setTimeout(() => syncPendingSales(), 1500);
      return () => clearTimeout(t);
    }
  }, [isOnline, syncPendingSales]);

  return { isOnline, pendingCount, isSyncing, lastSyncAt, refreshCache };
}

// ─── Sync a single pending sale to Supabase ─────────────────────────────────
async function syncOneSale(sale: PendingSale): Promise<void> {
  // Dedup: check if a sale with this local_id already synced
  const { data: existing } = await supabase
    .from('sales')
    .select('id')
    .eq('receipt_number', sale.receipt_number)
    .maybeSingle();

  if (existing) return; // already synced — skip

  // Insert the sale record
  const { data: inserted, error: saleErr } = await supabase
    .from('sales')
    .insert({
      tenant_id:        sale.tenant_id,
      branch_id:        sale.branch_id,
      cashier_id:       sale.cashier_id,
      receipt_number:   sale.receipt_number,
      subtotal:         sale.subtotal,
      tax_amount:       sale.tax_amount,
      discount_amount:  sale.discount_amount,
      total_amount:     sale.total_amount,
      amount_paid:      sale.amount_paid,
      change_due:       sale.change_due,
      payment_method:   sale.payment_method,
      status:           'completed',
      notes:            `[offline] synced from device — local_id:${sale.local_id}`,
      created_at:       sale.created_at,
    })
    .select('id')
    .single();

  if (saleErr) throw new Error(saleErr.message);

  const saleId = inserted.id;

  // Insert sale items — mapped to exact sale_items DB columns
  const items = sale.items.map(item => ({
    sale_id:              saleId,
    product_id:           item.product_id,
    product_name:         item.product_name,
    quantity:             item.quantity,
    unit_price:           item.unit_price,
    buying_cost_snapshot: item.buying_cost_snapshot,
    discount_amount:      item.discount_amount,
    tax_amount:           item.tax_amount,
    subtotal:             item.subtotal,
    cogs_amount:          item.cogs_amount,
    profit_amount:        item.profit_amount,
  }));

  const { error: itemsErr } = await supabase.from('sale_items').insert(items);
  if (itemsErr) throw new Error(itemsErr.message);
}
