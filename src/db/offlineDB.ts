/**
 * offlineDB.ts
 * IndexedDB wrapper for PosifyPro offline mode.
 *
 * Stores:
 *  - products       – cached product catalogue per tenant
 *  - categories     – cached categories per tenant
 *  - pending_sales  – queued sales to sync when back online
 *
 * All reads/writes are promise-based; no external library needed.
 */

const DB_NAME    = 'posifypro_offline';
const DB_VERSION = 1;

// ─── Store names ──────────────────────────────────────────────────────────────
export const STORE_PRODUCTS      = 'products';
export const STORE_CATEGORIES    = 'categories';
export const STORE_PENDING_SALES = 'pending_sales';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CachedProduct {
  id: string;
  tenant_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost_price: number;
  tax_rate: number;
  unit: string;
  category_id: string | null;
  category_name?: string;
  is_active: boolean;
  is_available: boolean;
  cached_at: number; // epoch ms
}

export interface CachedCategory {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  cached_at: number;
}

export type PendingSaleStatus = 'pending' | 'syncing' | 'failed';

export interface PendingSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;      // snapshot at sale time — NEVER use current product cost
  discount_pct: number;    // 0–100 per-item discount percentage
  tax_amount: number;
  line_total: number;      // unit_price * qty * (1 - discount_pct/100) — the revenue column
}

export interface PendingSale {
  local_id: string;          // uuid generated client-side (dedup key)
  tenant_id: string;
  branch_id: string | null;
  cashier_id: string;
  items: PendingSaleItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  change_due: number;
  payment_method: string;
  receipt_number: string;
  status: PendingSaleStatus;
  retry_count: number;
  created_at: string;        // ISO string
  last_attempt_at: string | null;
  error_message: string | null;
}

// ─── DB initialisation ────────────────────────────────────────────────────────
let _db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        const ps = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
        ps.createIndex('tenant_id', 'tenant_id', { unique: false });
        ps.createIndex('sku',       'sku',       { unique: false });
        ps.createIndex('barcode',   'barcode',   { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        const cs = db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
        cs.createIndex('tenant_id', 'tenant_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_PENDING_SALES)) {
        const ss = db.createObjectStore(STORE_PENDING_SALES, { keyPath: 'local_id' });
        ss.createIndex('tenant_id', 'tenant_id', { unique: false });
        ss.createIndex('status',    'status',    { unique: false });
      }
    };

    req.onsuccess  = (e) => { _db = (e.target as IDBOpenDBRequest).result; resolve(_db); };
    req.onerror    = ()  => reject(req.error);
  });
}

// ─── Generic helpers ──────────────────────────────────────────────────────────
function tx(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode = 'readonly',
) {
  return db.transaction(stores, mode);
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function cacheProducts(products: CachedProduct[]): Promise<void> {
  const db = await openDB();
  const t  = tx(db, STORE_PRODUCTS, 'readwrite');
  const s  = t.objectStore(STORE_PRODUCTS);
  await Promise.all(products.map(p => promisify(s.put(p))));
}

export async function getProductsByTenant(tenantId: string): Promise<CachedProduct[]> {
  const db  = await openDB();
  const idx = tx(db, STORE_PRODUCTS).objectStore(STORE_PRODUCTS).index('tenant_id');
  return promisify<CachedProduct[]>(idx.getAll(tenantId));
}

export async function searchProductsOffline(
  tenantId: string,
  query: string,
): Promise<CachedProduct[]> {
  const all = await getProductsByTenant(tenantId);
  const q   = query.toLowerCase();
  return all.filter(
    p => p.is_available && (
      p.name.toLowerCase().includes(q) ||
      (p.sku     ?? '').toLowerCase().includes(q) ||
      (p.barcode ?? '').toLowerCase().includes(q)
    ),
  );
}

export async function clearProductCache(tenantId: string): Promise<void> {
  const db  = await openDB();
  const idx = tx(db, STORE_PRODUCTS, 'readwrite').objectStore(STORE_PRODUCTS).index('tenant_id');
  const keys = await promisify<IDBValidKey[]>(idx.getAllKeys(tenantId));
  const s   = tx(db, STORE_PRODUCTS, 'readwrite').objectStore(STORE_PRODUCTS);
  await Promise.all(keys.map(k => promisify(s.delete(k))));
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function cacheCategories(categories: CachedCategory[]): Promise<void> {
  const db = await openDB();
  const s  = tx(db, STORE_CATEGORIES, 'readwrite').objectStore(STORE_CATEGORIES);
  await Promise.all(categories.map(c => promisify(s.put(c))));
}

export async function getCategoriesByTenant(tenantId: string): Promise<CachedCategory[]> {
  const db  = await openDB();
  const idx = tx(db, STORE_CATEGORIES).objectStore(STORE_CATEGORIES).index('tenant_id');
  return promisify<CachedCategory[]>(idx.getAll(tenantId));
}

// ─── Pending sales ────────────────────────────────────────────────────────────
export async function addPendingSale(sale: PendingSale): Promise<void> {
  const db = await openDB();
  const s  = tx(db, STORE_PENDING_SALES, 'readwrite').objectStore(STORE_PENDING_SALES);
  await promisify(s.put(sale));
}

export async function getPendingSalesByTenant(tenantId: string): Promise<PendingSale[]> {
  const db  = await openDB();
  const idx = tx(db, STORE_PENDING_SALES).objectStore(STORE_PENDING_SALES).index('tenant_id');
  return promisify<PendingSale[]>(idx.getAll(tenantId));
}

export async function updatePendingSale(sale: PendingSale): Promise<void> {
  const db = await openDB();
  const s  = tx(db, STORE_PENDING_SALES, 'readwrite').objectStore(STORE_PENDING_SALES);
  await promisify(s.put(sale));
}

export async function deletePendingSale(localId: string): Promise<void> {
  const db = await openDB();
  const s  = tx(db, STORE_PENDING_SALES, 'readwrite').objectStore(STORE_PENDING_SALES);
  await promisify(s.delete(localId));
}

export async function countPendingSales(tenantId: string): Promise<number> {
  const all = await getPendingSalesByTenant(tenantId);
  return all.filter(s => s.status === 'pending' || s.status === 'failed').length;
}
