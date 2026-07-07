/**
 * POSScreen.tsx — Enterprise POS Terminal
 * Features: barcode scanning, hold/resume sale, split payments,
 * discounts, tax management, receipt preview, offline support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, Minus, Trash2, Search,
  CreditCard, Banknote, Smartphone, Loader2, WifiOff,
  Pause, Play, Receipt, Percent, ScanBarcode, X, Users,
  Printer, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import {
  getProductsByTenant, cacheProducts, cacheCategories,
  getCategoriesByTenant, addPendingSale,
  type CachedProduct, type CachedCategory,
  type PendingSale, type PendingSaleItem,
} from '@/db/offlineDB';
import { formatCurrency } from '@/lib/currency';
import type { Customer } from '@/types/index';

interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  cost_price: number;   // snapshot — captured from product.cost_price at add-to-cart time
  quantity: number;
  tax_rate: number;
  discount_pct: number; // 0-100 per-item discount
}

interface HeldSale {
  id: string;
  label: string;
  cart: CartItem[];
  customer?: Customer | null;
  note?: string;
  heldAt: string;
}

interface SplitPayment { method: string; amount: string; }

const ALL_CAT = '__all__';
const TAX_RATE_DEFAULT = 0.16;

function genReceiptNumber(): string {
  const d = new Date();
  const dt = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `RCP-${dt}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}
function genLocalId() { return `local_${Date.now()}_${Math.random().toString(36).substring(2,9)}`; }

const PAYMENT_METHODS = [
  { id: 'cash',   label: 'Cash',   Icon: Banknote },
  { id: 'card',   label: 'Card',   Icon: CreditCard },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
];

export default function POSScreen() {
  const { appUser } = useAuth();
  const cc       = appUser?.currency_code ?? 'KES';
  const tenantId = appUser?.tenant_id ?? '';
  const branchId = appUser?.branch_id ?? null;
  const cashierId = appUser?.id ?? '';

  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [products,    setProducts]    = useState<CachedProduct[]>([]);
  const [categories,  setCategories]  = useState<CachedCategory[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [search,      setSearch]      = useState('');
  const [activeCat,   setActiveCat]   = useState(ALL_CAT);
  const [processing,  setProcessing]  = useState(false);

  // Hold/resume
  const [heldSales,   setHeldSales]   = useState<HeldSale[]>([]);
  const [holdOpen,    setHoldOpen]    = useState(false);

  // Discount
  const [discountPct, setDiscountPct] = useState(0); // cart-level %
  const [discountInput, setDiscountInput] = useState('0');

  // Customer
  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [custSearch,  setCustSearch]  = useState('');
  const [custOpen,    setCustOpen]    = useState(false);
  const [selCustomer, setSelCustomer] = useState<Customer | null>(null);

  // Payment
  const [payOpen,     setPayOpen]     = useState(false);
  const [payMethod,   setPayMethod]   = useState<string>('cash');
  const [amountPaid,  setAmountPaid]  = useState('');
  const [splitMode,   setSplitMode]   = useState(false);
  const [splits,      setSplits]      = useState<SplitPayment[]>([
    { method: 'cash', amount: '' }, { method: 'card', amount: '' }
  ]);

  // Receipt
  const [receiptOpen,  setReceiptOpen]  = useState(false);
  const [lastReceipt,  setLastReceipt]  = useState<{
    number: string; items: CartItem[]; subtotal: number;
    discount: number; tax: number; total: number;
    method: string; paid: number; change: number;
    customer?: Customer | null;
  } | null>(null);

  // Barcode input ref
  const barcodeRef = useRef<HTMLInputElement>(null);

  // ── Connectivity ──────────────────────────────────────────────────────────
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online',on); window.removeEventListener('offline',off); };
  }, []);

  // ── Load products ─────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      if (isOnline) {
        const now = Date.now();
        const [{ data: prods }, { data: cats }] = await Promise.all([
          supabase.from('products')
            .select('id,tenant_id,name,sku,barcode,price,cost_price,tax_rate,unit,category_id,is_active,is_available')
            .eq('tenant_id', tenantId).eq('is_active', true).eq('is_available', true).order('name'),
          supabase.from('categories')
            .select('id,tenant_id,name,sort_order,is_active')
            .eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
        ]);
        const catMap: Record<string,string> = {};
        if (cats) {
          for (const c of cats) catMap[c.id] = c.name;
          await cacheCategories(cats.map(c => ({ ...c, cached_at: now })));
          setCategories(cats.map(c => ({ ...c, cached_at: now })));
        }
        if (prods) {
          const enriched = prods.map(p => ({
            ...p, category_name: p.category_id ? (catMap[p.category_id] ?? '') : '', cached_at: now,
          }));
          await cacheProducts(enriched);
          setProducts(enriched);
        }
        // Load customers
        const { data: custs } = await supabase.from('customers')
          .select('id,name,email,phone,total_spent,total_purchases')
          .eq('tenant_id', tenantId).order('name').limit(200);
        setCustomers((custs ?? []) as unknown as Customer[]);
      } else {
        const [cached, cats] = await Promise.all([
          getProductsByTenant(tenantId), getCategoriesByTenant(tenantId),
        ]);
        setProducts(cached.filter(p => p.is_available));
        setCategories(cats);
      }
    } catch (err) {
      try {
        const [cached, cats] = await Promise.all([getProductsByTenant(tenantId), getCategoriesByTenant(tenantId)]);
        setProducts(cached.filter(p => p.is_available));
        setCategories(cats);
      } catch { toast.error('Failed to load products'); }
    } finally { setLoading(false); }
  }, [tenantId, isOnline]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── Barcode scan handler ──────────────────────────────────────────────────
  const handleBarcodeSearch = () => {
    const code = search.trim();
    if (!code) return;
    const match = products.find(p =>
      p.barcode === code || p.sku === code || p.name.toLowerCase() === code.toLowerCase()
    );
    if (match) { addToCart(match); setSearch(''); toast.success(`Added: ${match.name}`); }
    else toast.error(`No product found for "${code}"`);
  };

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (p: CachedProduct) => setCart(prev => {
    const ex = prev.find(i => i.product_id === p.id);
    if (ex) return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
    return [...prev, { product_id: p.id, product_name: p.name, unit_price: p.price, cost_price: p.cost_price ?? 0, quantity: 1, tax_rate: p.tax_rate ?? TAX_RATE_DEFAULT, discount_pct: 0 }];
  });

  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0));

  const updateItemDiscount = (id: string, pct: number) =>
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, discount_pct: Math.min(100, Math.max(0, pct)) } : i));

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal     = cart.reduce((s, i) => s + i.unit_price * i.quantity * (1 - i.discount_pct / 100), 0);
  const discountAmt  = subtotal * (discountPct / 100);
  const discounted   = subtotal - discountAmt;
  const taxAmount    = cart.reduce((s, i) => s + i.unit_price * i.quantity * (1 - i.discount_pct / 100) * i.tax_rate, 0) * (1 - discountPct / 100);
  const total        = discounted + taxAmount;
  const cartQty      = cart.reduce((s, i) => s + i.quantity, 0);
  const paidAmount   = parseFloat(amountPaid) || 0;
  const changeDue    = Math.max(0, paidAmount - total);

  // ── Hold sale ─────────────────────────────────────────────────────────────
  const holdSale = () => {
    if (!cart.length) { toast.error('Cart is empty'); return; }
    const held: HeldSale = {
      id: genLocalId(),
      label: `Sale #${heldSales.length + 1} ${new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`,
      cart: [...cart],
      customer: selCustomer,
      heldAt: new Date().toISOString(),
    };
    setHeldSales(prev => [...prev, held]);
    setCart([]); setSelCustomer(null); setDiscountPct(0); setDiscountInput('0');
    toast.success(`Sale held — ${held.label}`);
  };

  const resumeSale = (h: HeldSale) => {
    if (cart.length > 0) { toast.error('Clear current cart before resuming'); return; }
    setCart(h.cart);
    if (h.customer) setSelCustomer(h.customer);
    setHeldSales(prev => prev.filter(x => x.id !== h.id));
    setHoldOpen(false);
    toast.success(`Resumed: ${h.label}`);
  };

  // ── Checkout ──────────────────────────────────────────────────────────────
  const checkout = async () => {
    if (!cart.length) { toast.error('Cart is empty'); return; }
    if (!tenantId)    { toast.error('No tenant context'); return; }

    // Validate payment
    if (!splitMode) {
      if (payMethod === 'cash' && paidAmount < total) { toast.error(`Amount paid must be ≥ ${formatCurrency(total, cc)}`); return; }
    } else {
      const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
      if (Math.abs(splitTotal - total) > 0.01) { toast.error('Split amounts must equal total'); return; }
    }

    setProcessing(true);
    const receiptNumber = genReceiptNumber();
    const now = new Date().toISOString();
    const paid = splitMode ? total : (parseFloat(amountPaid) || total);
    const change = splitMode ? 0 : Math.max(0, paid - total);
    const finalMethod = splitMode ? 'split' : payMethod;

    const saleItems: PendingSaleItem[] = cart.map(i => {
      const lineTotal = +(i.unit_price * i.quantity * (1 - i.discount_pct / 100)).toFixed(2);
      const taxAmt    = +(lineTotal * i.tax_rate).toFixed(2);
      return {
        product_id:   i.product_id,
        product_name: i.product_name,
        quantity:     i.quantity,
        unit_price:   i.unit_price,
        cost_price:   i.cost_price,    // snapshot: cost at the moment of sale
        discount_pct: i.discount_pct,
        tax_amount:   taxAmt,
        line_total:   lineTotal,       // revenue per line: price * qty − item discount
      };
    });

    try {
      if (isOnline) {
        const { data: sale, error: saleErr } = await supabase.from('sales').insert({
          tenant_id: tenantId, branch_id: branchId, cashier_id: cashierId,
          customer_id: selCustomer?.id ?? null,
          receipt_number: receiptNumber,
          subtotal: +subtotal.toFixed(2),
          tax_amount: +taxAmount.toFixed(2),
          discount_amount: +discountAmt.toFixed(2),
          total_amount: +total.toFixed(2),
          amount_paid: +paid.toFixed(2),
          change_due: +change.toFixed(2),
          payment_method: finalMethod,
          status: 'completed',
          created_at: now,
        }).select('id').single();

        if (saleErr) throw new Error(saleErr.message);
        const { error: itemsErr } = await supabase.from('sale_items').insert(saleItems.map(item => ({ ...item, sale_id: sale.id, tenant_id: tenantId })));
        if (itemsErr) throw new Error(itemsErr.message);

        // Update customer total spent
        if (selCustomer) {
          await supabase.from('customers').update({
            total_spent: (selCustomer.total_spent ?? 0) + total,
            total_purchases: (selCustomer.total_purchases ?? 0) + 1,
          }).eq('id', selCustomer.id);
        }

        toast.success(`Sale complete — ${receiptNumber} · ${formatCurrency(total, cc)}`);
      } else {
        const pending: PendingSale = {
          local_id: genLocalId(), tenant_id: tenantId, branch_id: branchId, cashier_id: cashierId,
          items: saleItems, subtotal: +subtotal.toFixed(2), tax_amount: +taxAmount.toFixed(2),
          discount_amount: +discountAmt.toFixed(2), total_amount: +total.toFixed(2),
          amount_paid: +paid.toFixed(2), change_due: +change.toFixed(2),
          payment_method: finalMethod, receipt_number: receiptNumber,
          status: 'pending', retry_count: 0, created_at: now, last_attempt_at: null, error_message: null,
        };
        await addPendingSale(pending);
        toast.success(`Sale saved offline — ${receiptNumber} · ${formatCurrency(total, cc)}`);
      }

      // Save receipt data and show receipt
      setLastReceipt({
        number: receiptNumber, items: [...cart],
        subtotal, discount: discountAmt, tax: taxAmount, total,
        method: finalMethod, paid, change,
        customer: selCustomer,
      });
      setCart([]); setSelCustomer(null); setDiscountPct(0); setDiscountInput('0');
      setAmountPaid(''); setSplitMode(false);
      setPayOpen(false);
      setReceiptOpen(true);
    } catch (err) {
      toast.error(`Checkout failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally { setProcessing(false); }
  };

  // ── Filtered products ─────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchCat = activeCat === ALL_CAT || p.category_id === activeCat;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const filteredCustomers = customers.filter(c =>
    !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.phone ?? '').includes(custSearch)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground text-balance">Point of Sale</h2>
          <p className="text-sm text-muted-foreground">Process transactions fast</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-destructive/10 border border-destructive/30">
              <WifiOff className="w-3.5 h-3.5 text-destructive shrink-0" />
              <span className="text-xs font-medium text-destructive">Offline</span>
            </div>
          )}
          {heldSales.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setHoldOpen(true)} className="gap-1.5 h-8">
              <Play className="w-3.5 h-3.5" /> Held ({heldSales.length})
            </Button>
          )}
          {cart.length > 0 && (
            <Button variant="outline" size="sm" onClick={holdSale} className="gap-1.5 h-8">
              <Pause className="w-3.5 h-3.5" /> Hold Sale
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        {/* ── Product grid ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Barcode + search row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={barcodeRef}
                placeholder="Search / scan barcode…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()}
                className="pl-9 pr-3 h-9"
              />
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 h-9 shrink-0" onClick={handleBarcodeSearch}>
              <ScanBarcode className="w-4 h-4" /> Scan
            </Button>
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button key={ALL_CAT} variant={activeCat === ALL_CAT ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setActiveCat(ALL_CAT)}>All</Button>
            {categories.map(c => (
              <Button key={c.id} variant={activeCat === c.id ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setActiveCat(c.id)}>{c.name}</Button>
            ))}
          </div>

          {/* Product tiles */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 rounded border border-border bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredProducts.map(p => {
                const inCart = cart.find(i => i.product_id === p.id);
                return (
                  <button key={p.id} type="button" onClick={() => addToCart(p)}
                    className={`relative p-3 rounded border text-left transition-colors duration-100 h-20 flex flex-col justify-between pos-btn-active ${
                      inCart ? 'border-[hsl(var(--chart-1))] bg-blue-50 dark:bg-blue-950/30' : 'border-border bg-card hover:border-primary hover:bg-secondary'
                    }`}>
                    <span className="text-xs font-medium text-foreground leading-tight line-clamp-2 text-balance">{p.name}</span>
                    <span className="text-sm font-bold text-foreground">{formatCurrency(p.price, cc)}</span>
                    {inCart && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[hsl(var(--chart-1))] text-white text-xs font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
              {!loading && filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  {products.length === 0 ? 'No products loaded.' : 'No products match.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Cart panel ───────────────────────────────────────────────── */}
        <div className="xl:w-80 shrink-0">
          <Card className="border border-border sticky top-20 shadow-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Cart
                  {cartQty > 0 && <Badge variant="secondary" className="text-xs">{cartQty}</Badge>}
                </CardTitle>
                {/* Customer selector */}
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setCustOpen(true)}>
                  <Users className="w-3.5 h-3.5" />
                  {selCustomer ? selCustomer.name.split(' ')[0] : 'Guest'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Cart is empty</p>
              ) : (
                <>
                  {/* Cart items */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.product_id} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate">{item.product_name}</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button type="button" onClick={() => updateQty(item.product_id, -1)} className="w-5 h-5 rounded bg-secondary flex items-center justify-center hover:bg-muted">
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
                            <button type="button" onClick={() => updateQty(item.product_id, 1)} className="w-5 h-5 rounded bg-secondary flex items-center justify-center hover:bg-muted">
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                            <button type="button" onClick={() => updateQty(item.product_id, -item.quantity)} className="w-5 h-5 rounded hover:bg-destructive/10 flex items-center justify-center text-destructive">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <span className="text-xs font-semibold w-16 text-right shrink-0">
                            {formatCurrency(item.unit_price * item.quantity * (1 - item.discount_pct / 100), cc)}
                          </span>
                        </div>
                        {/* Per-item discount */}
                        <div className="flex items-center gap-1 pl-0.5">
                          <Percent className="w-3 h-3 text-muted-foreground shrink-0" />
                          <Input
                            type="number" min="0" max="100"
                            value={item.discount_pct || ''}
                            placeholder="0"
                            onChange={e => updateItemDiscount(item.product_id, parseFloat(e.target.value) || 0)}
                            className="h-5 w-14 text-xs px-2 py-0 border-dashed"
                          />
                          <span className="text-xs text-muted-foreground">% off</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Cart-level discount */}
                  <div className="flex items-center gap-2">
                    <Percent className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Order discount</Label>
                    <Input
                      type="number" min="0" max="100"
                      value={discountInput}
                      onChange={e => { setDiscountInput(e.target.value); setDiscountPct(parseFloat(e.target.value) || 0); }}
                      className="h-6 w-16 text-xs px-2 py-0"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>

                  {/* Totals */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span><span>{formatCurrency(subtotal, cc)}</span>
                    </div>
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-[hsl(var(--success))]">
                        <span>Discount ({discountPct}%)</span><span>-{formatCurrency(discountAmt, cc)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>VAT (16%)</span><span>{formatCurrency(taxAmount, cc)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                      <span>Total</span><span>{formatCurrency(total, cc)}</span>
                    </div>
                  </div>

                  {/* Checkout button */}
                  <Button className="w-full h-10 font-semibold gap-2 bg-gradient-button hover:opacity-90 text-white"
                    onClick={() => setPayOpen(true)} disabled={processing}>
                    <CreditCard className="w-4 h-4" />
                    Checkout {formatCurrency(total, cc)}
                  </Button>

                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-destructive h-7"
                    onClick={() => { setCart([]); setDiscountPct(0); setDiscountInput('0'); setSelCustomer(null); }}>
                    Clear Cart
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Customer selector dialog ──────────────────────────────────────── */}
      <Dialog open={custOpen} onOpenChange={setCustOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>Select Customer</DialogTitle></DialogHeader>
          <Input placeholder="Search customers…" value={custSearch} onChange={e => setCustSearch(e.target.value)} className="h-9 px-3" />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-secondary text-left"
              onClick={() => { setSelCustomer(null); setCustOpen(false); }}>
              <span className="text-sm text-muted-foreground">Guest (no customer)</span>
            </button>
            {filteredCustomers.map(c => (
              <button key={c.id} type="button"
                className={`w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-secondary text-left transition-colors ${selCustomer?.id === c.id ? 'bg-secondary' : ''}`}
                onClick={() => { setSelCustomer(c); setCustOpen(false); }}>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                </div>
              </button>
            ))}
            {filteredCustomers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No customers found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Hold/resume dialog ────────────────────────────────────────────── */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader><DialogTitle>Held Sales</DialogTitle></DialogHeader>
          {heldSales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No held sales</p>
          ) : (
            <div className="space-y-2">
              {heldSales.map(h => (
                <div key={h.id} className="flex items-center justify-between gap-3 p-3 rounded border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{h.label}</p>
                    <p className="text-xs text-muted-foreground">{h.cart.length} items · {formatCurrency(
                      h.cart.reduce((s, i) => s + i.unit_price * i.quantity, 0), cc
                    )}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => resumeSale(h)}>
                      <Play className="w-3 h-3" /> Resume
                    </Button>
                    <button type="button" className="text-destructive hover:bg-destructive/10 rounded p-1"
                      onClick={() => setHeldSales(prev => prev.filter(x => x.id !== h.id))}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Payment dialog ────────────────────────────────────────────────── */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader><DialogTitle>Payment — {formatCurrency(total, cc)}</DialogTitle></DialogHeader>

          <Tabs defaultValue="single" onValueChange={v => setSplitMode(v === 'split')}>
            <TabsList className="w-full h-8 mb-3">
              <TabsTrigger value="single" className="flex-1 text-xs">Single Payment</TabsTrigger>
              <TabsTrigger value="split"  className="flex-1 text-xs">Split Payment</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ id, label, Icon }) => (
                  <button key={id} type="button"
                    onClick={() => setPayMethod(id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded border transition-colors ${
                      payMethod === id ? 'border-[hsl(var(--chart-1))] bg-blue-50 dark:bg-blue-950/30' : 'border-border hover:border-primary'
                    }`}>
                    <Icon className="w-5 h-5 text-foreground" />
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>
              {payMethod === 'cash' && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal">Amount Tendered</Label>
                  <Input
                    type="number" min={total.toFixed(2)} step="0.01"
                    placeholder={total.toFixed(2)}
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    className="h-10 px-3 text-base font-bold"
                  />
                  {paidAmount >= total && (
                    <div className="flex justify-between text-sm p-2 bg-green-50 dark:bg-green-950/30 rounded">
                      <span className="text-green-700 dark:text-green-400">Change Due</span>
                      <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(changeDue, cc)}</span>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="split" className="space-y-3">
              <p className="text-xs text-muted-foreground">Total: <span className="font-bold text-foreground">{formatCurrency(total, cc)}</span></p>
              {splits.map((sp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={sp.method}
                    onChange={e => setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, method: e.target.value } : s))}
                    className="h-9 rounded border border-input bg-background text-sm px-2 flex-1">
                    {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <Input type="number" placeholder="Amount"
                    value={sp.amount}
                    onChange={e => setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, amount: e.target.value } : s))}
                    className="h-9 w-28 px-3 text-sm" />
                </div>
              ))}
              <div className="text-xs text-muted-foreground text-right">
                Remaining: {formatCurrency(Math.max(0, total - splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)), cc)}
              </div>
            </TabsContent>
          </Tabs>

          <Separator />
          {selCustomer && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 py-1">
              <Users className="w-3.5 h-3.5 shrink-0" />
              Customer: <span className="font-medium text-foreground">{selCustomer.name}</span>
            </div>
          )}

          <Button className="w-full h-11 font-semibold text-base gap-2 bg-gradient-button hover:opacity-90 text-white"
            onClick={checkout} disabled={processing}>
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirm Payment
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Receipt dialog ────────────────────────────────────────────────── */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" /> Sale Complete
            </DialogTitle>
          </DialogHeader>
          {lastReceipt && (
            <div className="space-y-3">
              <div className="text-center space-y-0.5">
                <p className="text-xs font-mono text-muted-foreground">{lastReceipt.number}</p>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleString()}</p>
                {lastReceipt.customer && <p className="text-xs text-foreground font-medium">Customer: {lastReceipt.customer.name}</p>}
              </div>
              <Separator />
              <div className="space-y-1.5 text-xs">
                {lastReceipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="text-muted-foreground flex-1 min-w-0 truncate">{item.product_name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">{formatCurrency(item.unit_price * item.quantity * (1 - item.discount_pct / 100), cc)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(lastReceipt.subtotal, cc)}</span></div>
                {lastReceipt.discount > 0 && <div className="flex justify-between text-[hsl(var(--success))]"><span>Discount</span><span>-{formatCurrency(lastReceipt.discount, cc)}</span></div>}
                <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{formatCurrency(lastReceipt.tax, cc)}</span></div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                  <span>TOTAL</span><span>{formatCurrency(lastReceipt.total, cc)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground capitalize"><span>Payment ({lastReceipt.method})</span><span>{formatCurrency(lastReceipt.paid, cc)}</span></div>
                {lastReceipt.change > 0 && <div className="flex justify-between font-semibold text-[hsl(var(--success))]"><span>Change</span><span>{formatCurrency(lastReceipt.change, cc)}</span></div>}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-8 text-xs" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
                <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => setReceiptOpen(false)}>
                  New Sale
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
