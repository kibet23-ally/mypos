import { openDB, type IDBPDatabase } from 'idb';

/**
 * Offline storage layer for PosifyPro.
 *
 * Stores:
 *  - 'session'         : single row holding the last-known profile + tenant,
 *                        so a previously authenticated user can open the app
 *                        offline.
 *  - 'products'         : cached product catalogue per tenant, refreshed
 *                        whenever online (used to render the POS grid offline).
 *  - 'pendingSales'      : sales made while offline, queued for sync.
 *  - 'salesHistory'      : a rolling window (default 90 days) of completed
 *                        sales, refreshed whenever online, so Dashboard/Reports
 *                        can render real charts offline instead of an empty
 *                        "needs connection" state.
 *  - 'saleItemsHistory'   : line items for the sales in salesHistory, needed
 *                        for category/product breakdowns in Reports.
 *
 * Deliberately NOT cached here: customers, settings beyond tax_rate/currency
 * (already travel inside the cached tenant record), and sales older than the
 * history window. Expanding further is a separate task.
 */

const DB_NAME = 'posifypro-offline';
const DB_VERSION = 3;

export interface CachedSession {
  id: 'current'; // singleton row
  profile: any;
  tenant: any;
  cachedAt: string;
}

export interface PendingSale {
  localId: string; // generated offline, distinct from the eventual server id
  tenant_id: string;
  cashier_id: string;
  // Kept for the receipt/UI only — NOT sent to Supabase directly, since
  // `sales` has no `items` column. Line items belong in `sale_items`,
  // inserted separately after the parent sale row is created at sync time.
  items: { product_id: string; name: string; qty: number; price: number }[];
  // Real `sales` columns — confirmed against the live schema (see migration
  // 00010 and the OWPOS/CAPOS fix). These map 1:1 onto the insert at sync time.
  subtotal: number;
  discount_amount: number;
  amount_paid: number;
  total_amount: number;
  change_due: number;
  payment_method: string;
  status: string;
  receipt_number: string;
  created_at: string; // when the sale actually happened, not when it synced
  synced: boolean;
  syncError?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id');
        }
        if (!db.objectStoreNames.contains('pendingSales')) {
          const store = db.createObjectStore('pendingSales', { keyPath: 'localId' });
          store.createIndex('tenant_id', 'tenant_id');
        } else if (oldVersion < 3) {
          // CRITICAL FIX (v3): pendingSales had no tenant_id index, so every
          // tenant's pending sales were visible to every other tenant on the
          // same device/browser. Add the index now for installs created
          // before this fix existed.
          const store = transaction.objectStore('pendingSales');
          if (!store.indexNames.contains('tenant_id')) {
            store.createIndex('tenant_id', 'tenant_id');
            console.warn('[OfflineDB] Migrated pendingSales store to add tenant_id index (security fix)');
          }
        }
        // Added in version 2 — existing installs on version 1 get these
        // created automatically the next time the app loads and bumps the DB.
        if (!db.objectStoreNames.contains('salesHistory')) {
          const store = db.createObjectStore('salesHistory', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id');
        }
        if (!db.objectStoreNames.contains('saleItemsHistory')) {
          const store = db.createObjectStore('saleItemsHistory', { keyPath: 'compositeKey' });
          store.createIndex('tenant_id', 'tenant_id');
          store.createIndex('sale_id', 'sale_id');
        }
      },
    });
  }
  return dbPromise;
}

// ── Session (profile + tenant) ──────────────────────────────────────────

export async function cacheSession(profile: any, tenant: any) {
  const db = await getDb();
  await db.put('session', { id: 'current', profile, tenant, cachedAt: new Date().toISOString() });
  console.log('[OfflineDB] Cached session for offline login:', profile?.email);
}

export async function getCachedSession(): Promise<CachedSession | undefined> {
  const db = await getDb();
  const row = await db.get('session', 'current');
  if (row) console.log('[OfflineDB] Loaded cached session from', row.cachedAt);
  return row;
}

export async function clearCachedSession() {
  const db = await getDb();
  await db.delete('session', 'current');
  console.log('[OfflineDB] Cleared cached session (sign out)');
}

// ── Products ─────────────────────────────────────────────────────────────

export async function cacheProducts(tenantId: string, products: any[]) {
  const db = await getDb();
  const tx = db.transaction('products', 'readwrite');
  // Replace this tenant's cached products wholesale so stale/deleted items don't linger.
  const existing = await tx.store.index('tenant_id').getAllKeys(tenantId);
  await Promise.all(existing.map(key => tx.store.delete(key)));
  await Promise.all(products.map(p => tx.store.put({ ...p, tenant_id: tenantId })));
  await tx.done;
  console.log(`[OfflineDB] Cached ${products.length} products for tenant ${tenantId}`);
}

export async function getCachedProducts(tenantId: string): Promise<any[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('products', 'tenant_id', tenantId);
  console.log(`[OfflineDB] Loaded ${all.length} cached products (offline mode)`);
  return all;
}

// ── Pending sales queue ──────────────────────────────────────────────────

export async function queuePendingSale(sale: Omit<PendingSale, 'localId' | 'synced'>) {
  const db = await getDb();
  const localId = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record: PendingSale = { ...sale, localId, synced: false };
  await db.put('pendingSales', record);
  console.log('[OfflineDB] Queued offline sale for later sync:', localId, '— total:', sale.total);
  return record;
}

export async function getPendingSales(tenantId: string): Promise<PendingSale[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('pendingSales', 'tenant_id', tenantId);
  return all.filter(s => !s.synced);
}

export async function markSaleSynced(localId: string) {
  const db = await getDb();
  await db.delete('pendingSales', localId);
  console.log('[OfflineDB] Synced and removed from queue:', localId);
}

export async function markSaleFailed(localId: string, error: string) {
  const db = await getDb();
  const record = await db.get('pendingSales', localId);
  if (record) {
    await db.put('pendingSales', { ...record, syncError: error });
    console.error('[OfflineDB] Sale sync failed, will retry:', localId, error);
  }
}

export async function getPendingSaleCount(tenantId: string): Promise<number> {
  const pending = await getPendingSales(tenantId);
  return pending.length;
}

// ── Sync queue (Stage 3) ─────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  failed: number;
  errors: { localId: string; message: string }[];
}

/**
 * Uploads all pending offline sales for a tenant to Supabase, in order
 * (oldest first), one at a time. For each sale:
 *  1. Insert the parent row into `sales` using only real columns.
 *  2. Insert its line items into `sale_items`.
 *  3. Decrement product stock — LAST-WRITE-WINS, no pre-sync stock check.
 *     If two offline devices sold the same product and combined sales now
 *     exceed what's in stock, the second sync to run will push stock below
 *     zero. This is the explicitly agreed policy (not a bug): it keeps sync
 *     simple and makes any overselling visible in the products table rather
 *     than silently dropping or merging sales.
 *  4. Mark the local queue entry as synced (removed) on success, or record
 *     the error and leave it queued for the next attempt on failure.
 *
 * Requires a real Supabase client import — call only when navigator.onLine
 * is true; this function does not check connectivity itself.
 */
export async function syncPendingSales(
  tenantId: string,
  supabaseClient: any
): Promise<SyncResult> {
  const pending = await getPendingSales(tenantId);
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  if (pending.length === 0) return result;

  console.log(`[OfflineDB] Starting sync of ${pending.length} pending sale(s) for tenant ${tenantId}`);

  // Oldest first, so receipts/stock changes apply in the order they actually happened.
  const ordered = [...pending].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  for (const sale of ordered) {
    try {
      // Self-heal a known legacy value: an earlier version of the checkout UI
      // used 'mobile' as a payment_method key, which was never valid in the
      // database enum (cash, mpesa, card, bank_transfer, other). Any sale
      // already queued with that old value is remapped here so it can finally
      // sync instead of failing forever — new sales already use 'mpesa' directly.
      const normalizedPaymentMethod = sale.payment_method === 'mobile' ? 'mpesa' : sale.payment_method;

      const { data: insertedSale, error: saleError } = await supabaseClient
        .from('sales')
        .insert({
          tenant_id: sale.tenant_id,
          cashier_id: sale.cashier_id,
          subtotal: sale.subtotal,
          discount_amount: sale.discount_amount,
          amount_paid: sale.amount_paid,
          total_amount: sale.total_amount,
          change_due: sale.change_due,
          payment_method: normalizedPaymentMethod,
          status: sale.status,
          receipt_number: sale.receipt_number,
          created_at: sale.created_at, // preserve the original sale time, not sync time
        })
        .select('id')
        .single();

      if (saleError) throw saleError;

      // Insert line items against the new server-assigned sale id.
      if (sale.items.length > 0) {
        const itemRows = sale.items.map(it => ({
          sale_id: insertedSale.id,
          product_id: it.product_id,
          product_name: it.name,
          quantity: it.qty,
          unit_price: it.price,
          subtotal: it.price * it.qty,
        }));
        const { error: itemsError } = await supabaseClient.from('sale_items').insert(itemRows);
        if (itemsError) {
          // Sale itself succeeded — log but don't fail the whole sync over
          // line items, since the financial record (the part that matters
          // most) is already safely recorded.
          console.error(`[OfflineDB] Sale ${sale.localId} synced but sale_items failed:`, itemsError.message);
        }
      }

      // Decrement stock per item — last-write-wins, no pre-check (see doc comment above).
      await Promise.all(
        sale.items.map(async it => {
          const { data: product } = await supabaseClient.from('products').select('stock').eq('id', it.product_id).maybeSingle();
          if (product) {
            await supabaseClient.from('products').update({ stock: product.stock - it.qty }).eq('id', it.product_id);
          }
        })
      );

      await markSaleSynced(sale.localId);
      result.synced++;
      console.log(`[OfflineDB] Synced offline sale ${sale.localId} → server id ${insertedSale.id}`);
    } catch (err: any) {
      const message = err?.message ?? 'Unknown sync error';
      await markSaleFailed(sale.localId, message);
      result.failed++;
      result.errors.push({ localId: sale.localId, message });
      console.error(`[OfflineDB] Failed to sync sale ${sale.localId}:`, message);
    }
  }

  console.log(`[OfflineDB] Sync complete — ${result.synced} synced, ${result.failed} failed`);
  return result;
}

// ── Sales history (for offline Dashboard/Reports) ───────────────────────

const HISTORY_WINDOW_DAYS = 90;

export function historyWindowStartISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - HISTORY_WINDOW_DAYS);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function cacheSalesHistory(tenantId: string, sales: any[]) {
  const db = await getDb();
  const tx = db.transaction('salesHistory', 'readwrite');
  const existing = await tx.store.index('tenant_id').getAllKeys(tenantId);
  await Promise.all(existing.map(key => tx.store.delete(key)));
  await Promise.all(sales.map(s => tx.store.put({ ...s, tenant_id: tenantId })));
  await tx.done;
  console.log(`[OfflineDB] Cached ${sales.length} historical sales (last ${HISTORY_WINDOW_DAYS} days) for tenant ${tenantId}`);
}

export async function getCachedSalesHistory(tenantId: string): Promise<any[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('salesHistory', 'tenant_id', tenantId);
  console.log(`[OfflineDB] Loaded ${all.length} cached historical sales (offline mode)`);
  return all;
}

export async function cacheSaleItemsHistory(tenantId: string, items: any[]) {
  const db = await getDb();
  const tx = db.transaction('saleItemsHistory', 'readwrite');
  const existing = await tx.store.index('tenant_id').getAllKeys(tenantId);
  await Promise.all(existing.map(key => tx.store.delete(key)));
  await Promise.all(
    items.map(it => tx.store.put({ ...it, tenant_id: tenantId, compositeKey: `${it.sale_id}-${it.product_id}` }))
  );
  await tx.done;
  console.log(`[OfflineDB] Cached ${items.length} historical sale line-items for tenant ${tenantId}`);
}

export async function getCachedSaleItemsHistory(tenantId: string): Promise<any[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('saleItemsHistory', 'tenant_id', tenantId);
  return all;
}
