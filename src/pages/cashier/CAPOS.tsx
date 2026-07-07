<<<<<<< HEAD
import POSScreen from '@/components/pos/POSScreen';

export default function CAPOS() {
  return <POSScreen />;
=======
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from 'sonner';
import { Search, Plus, Minus, X, CreditCard, Banknote, Smartphone, ShoppingCart, Zap, CloudOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { type ReceiptData } from '@/lib/receiptUtils';
import { useCurrency } from '@/hooks/useCurrency';
import ReceiptModal from '@/components/common/ReceiptModal';
import { cacheProducts, getCachedProducts, queuePendingSale, getPendingSaleCount } from '@/lib/offlineDb';

interface Product { id: string; name: string; sku: string; price: number; buying_cost: number; stock: number; category: string; }
interface CartItem extends Product { qty: number; }

// mpesa matches the real DB enum value (cash, mpesa, card, bank_transfer, other)
const PAYMENT_METHODS = [
  { key: 'cash',  label: 'Cash',   icon: Banknote },
  { key: 'card',  label: 'Card',   icon: CreditCard },
  { key: 'mpesa', label: 'M-Pesa', icon: Smartphone },
];

function fuzzyScore(text: string, query: string): number {
  if (!query) return 1;
  const t = text.toLowerCase(); const q = query.toLowerCase();
  if (t.includes(q)) return 1;
  let score = 0, qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) { if (t[ti] === q[qi]) { score++; qi++; } }
  return qi === q.length ? score / t.length : 0;
}

function generateReceiptNumber() {
  return 'RCT-' + Date.now().toString(36).toUpperCase();
}

export default function CAPOS() {
  const { appUser } = useAuth();
  const isOnline = useOnlineStatus();
  const { format: formatAmt } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 200);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const taxRate = appUser?.tenant?.tax_rate ?? 0;
  const hasTaxRate = appUser?.tenant?.tax_rate !== undefined && appUser?.tenant?.tax_rate !== null;

  const refreshPendingCount = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    setPendingCount(await getPendingSaleCount(appUser.tenant_id));
  }, [appUser?.tenant_id]);

  const loadProducts = useCallback(async () => {
    if (!appUser?.tenant_id) return;
    if (!isOnline) {
      setProducts(await getCachedProducts(appUser.tenant_id));
      return;
    }
    const { data, error } = await supabase.from('products').select('*').eq('tenant_id', appUser.tenant_id).gt('stock', 0);
    if (error) {
      console.error('[CAPOS] Failed to load products, falling back to cache:', error);
      setProducts(await getCachedProducts(appUser.tenant_id));
      return;
    }
    const list = Array.isArray(data) ? data : [];
    setProducts(list);
    cacheProducts(appUser.tenant_id, list).catch(err => console.error('[CAPOS] Failed to cache products:', err));
  }, [appUser?.tenant_id, isOnline]);

  useEffect(() => { loadProducts(); refreshPendingCount(); }, [loadProducts, refreshPendingCount]);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = products
    .filter(p => activeCategory === 'All' || p.category === activeCategory)
    .map(p => ({ ...p, score: Math.max(fuzzyScore(p.name, search), fuzzyScore(p.sku, search), fuzzyScore(p.category, search)) }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === p.id);
      if (existing) {
        if (existing.qty >= p.stock) { toast.error('Max stock reached'); return prev; }
        return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...p, qty: 1 }];
    });
  };
  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const tenderedAmount = payMethod === 'cash' ? parseFloat(cashTendered || '0') : total;
  const changeDue = payMethod === 'cash' ? Math.max(0, tenderedAmount - total) : 0;
  const cashInsufficient = payMethod === 'cash' && cart.length > 0 && (cashTendered === '' || tenderedAmount < total);

  const checkout = async () => {
    if (!cart.length) { toast.error('Cart is empty'); return; }
    if (!appUser?.tenant_id) { toast.error('No business account found.'); return; }
    if (!hasTaxRate) toast.warning('Tax rate not set — charging 0% tax. Configure it in Settings.');
    if (cashInsufficient) { toast.error('Cash tendered is less than the total due'); return; }

    setProcessing(true);
    const receiptNumber = generateReceiptNumber();
    const items = cart.map(i => ({ product_id: i.id, name: i.name, qty: i.qty, price: i.price }));
    const cogsAmount = cart.reduce((sum, i) => sum + (i.buying_cost ?? 0) * i.qty, 0);
    const saleNow = new Date().toISOString();
    const amountPaid = payMethod === 'cash' ? tenderedAmount : total;
    const change = payMethod === 'cash' ? changeDue : 0;

    if (!isOnline) {
      await queuePendingSale({
        tenant_id: appUser.tenant_id,
        cashier_id: appUser.id,
        items,
        subtotal,
        discount_amount: 0,
        amount_paid: amountPaid,
        total_amount: total,
        change_due: change,
        cogs_amount: cogsAmount,
        profit_amount: total - cogsAmount,
        payment_method: payMethod,
        status: 'completed',
        receipt_number: receiptNumber,
        created_at: saleNow,
      });
      const updatedProducts = products.map(p => {
        const sold = cart.find(c => c.id === p.id);
        return sold ? { ...p, stock: p.stock - sold.qty } : p;
      });
      setProducts(updatedProducts);
      cacheProducts(appUser.tenant_id, updatedProducts).catch(() => {});
      await refreshPendingCount();
      toast.warning('Saved offline — will sync when connection returns', { icon: <CloudOff className="w-4 h-4" /> });
    } else {
      const { error } = await supabase.from('sales').insert({
        tenant_id: appUser.tenant_id,
        cashier_id: appUser.id,
        subtotal,
        discount_amount: 0,
        amount_paid: amountPaid,
        total_amount: total,
        change_due: change,
        cogs_amount: cogsAmount,
        profit_amount: total - cogsAmount,
        payment_method: payMethod,
        status: 'completed',
        receipt_number: receiptNumber,
      });
      if (error) {
        console.error('[CAPOS] Sale insert FAILED:', error);
        toast.error(`Sale failed to save: ${error.message}`);
        setProcessing(false);
        return;
      }
      await Promise.all(
        cart.map(item => supabase.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id))
      );
    }

    const receipt: ReceiptData = {
      transactionId: receiptNumber,
      businessName: appUser?.tenant?.business_name ?? 'PosifyPro',
      cashierName: appUser?.display_name ?? appUser?.email ?? 'Staff',
      items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal, tax, total,
      paymentMethod: payMethod,
      timestamp: new Date(),
      cashTendered: payMethod === 'cash' ? tenderedAmount : undefined,
      changeDue: payMethod === 'cash' ? changeDue : undefined,
    };
    setProcessing(false);
    setCart([]);
    setCashTendered('');
    loadProducts();
    setReceiptData(receipt);
    setReceiptOpen(true);
  };

  // ── Payment method active styles ──────────────────────────────────────────
  const activeStyles: Record<string, { bg: string; border: string; text: string; iconColor: string }> = {
    cash:  { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', iconColor: '#16A34A' },
    card:  { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', iconColor: '#2563EB' },
    mpesa: { bg: '#FFF7ED', border: '#FDB78A', text: '#C2410C', iconColor: '#EA580C' },
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)] fade-in">
      {receiptOpen && receiptData && (
        <ReceiptModal data={receiptData} formatAmt={formatAmt} onClose={() => setReceiptOpen(false)} />
      )}

      {/* ── Products panel ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-slate-900">POS Terminal</h2>
            {!isOnline && (
              <Badge className="text-xs bg-amber-50 border border-amber-200 text-amber-700 gap-1">
                <CloudOff className="w-3 h-3" /> Offline
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge className="text-xs bg-blue-50 border border-blue-200 text-blue-700">
                {pendingCount} sale{pendingCount === 1 ? '' : 's'} pending sync
              </Badge>
            )}
          </div>
          <div className="relative">
            {!searchRaw && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
            <Input placeholder="Search products or scan SKU…" value={searchRaw} onChange={e => setSearchRaw(e.target.value)}
              className={`h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3 w-full ${!searchRaw ? 'pl-9' : 'pl-3'}`} />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={activeCategory === cat
                ? { background: '#2563EB', color: '#fff' }
                : { background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}>
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-sm text-slate-400">
                {products.length === 0 && !isOnline
                  ? 'No cached products — ask your owner to open the app online once'
                  : products.length === 0 ? 'No products in inventory' : 'No products match your search'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
              {filtered.map(p => (
                <button key={p.id} onClick={() => addToCart(p)}
                  className="rounded-xl p-3 border text-left hover:border-blue-300 transition-all pos-btn-active"
                  style={{ background: '#fff', borderColor: '#E2E8F0' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: '#EFF6FF' }}>
                    <Zap className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-blue-600">{formatAmt(p.price)}</span>
                    <span className="text-xs text-slate-400">{p.stock} left</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Cart panel ── */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col rounded-2xl border overflow-hidden"
        style={{ background: '#fff', borderColor: '#E2E8F0' }}>
        {/* Cart header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-slate-900">Cart</span>
            {cart.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ background: '#2563EB' }}>
                {cart.length}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={() => { setCart([]); setCashTendered(''); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Clear</button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10">
              <ShoppingCart className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Tap a product to add</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{formatAmt(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors">
                      <Minus className="w-3 h-3 text-slate-600" />
                    </button>
                    <span className="text-sm font-semibold text-slate-900 w-5 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors">
                      <Plus className="w-3 h-3 text-slate-600" />
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors ml-1">
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout area */}
        <div className="border-t border-slate-100 px-4 py-4 space-y-3">
          {/* Order summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono text-slate-900">{formatAmt(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax {hasTaxRate ? `(${taxRate}%)` : '(not set)'}</span>
              <span className="font-mono text-slate-900">{formatAmt(tax)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5">
              <span className="text-slate-900">Total</span>
              <span className="font-mono text-blue-600 text-base">{formatAmt(total)}</span>
            </div>
          </div>

          {/* Payment method selector */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(m => {
                const isActive = payMethod === m.key;
                const s = activeStyles[m.key];
                return (
                  <button
                    key={m.key}
                    onClick={() => { setPayMethod(m.key); setCashTendered(''); }}
                    className="h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2 focus:outline-none"
                    style={isActive
                      ? { background: s.bg, borderColor: s.border, color: s.text }
                      : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#94A3B8' }}
                  >
                    <m.icon className="w-4 h-4" style={{ color: isActive ? s.iconColor : '#CBD5E1' }} />
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash tendered / change due */}
          {payMethod === 'cash' && (
            <div className="rounded-xl border border-green-100 bg-green-50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-green-800 shrink-0">Cash Tendered</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder={formatAmt(total)}
                  value={cashTendered}
                  onChange={e => setCashTendered(e.target.value)}
                  className="h-9 text-sm font-mono text-right bg-white border-green-200 focus:border-green-400 rounded-lg px-2 max-w-[140px] text-slate-900"
                />
              </div>
              <div className="flex justify-between items-center border-t border-green-100 pt-2">
                <span className="text-xs font-semibold text-green-800">Change Due</span>
                <span className={`text-sm font-bold font-mono ${cashInsufficient ? 'text-red-600' : 'text-green-700'}`}>
                  {cashTendered === '' ? '—' : cashInsufficient ? 'Insufficient' : formatAmt(changeDue)}
                </span>
              </div>
            </div>
          )}

          {/* Charge button */}
          <button
            onClick={checkout}
            disabled={processing || cart.length === 0 || cashInsufficient}
            className="w-full h-12 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
            style={{
              background: cart.length > 0 && !cashInsufficient ? '#2563EB' : '#94A3B8',
              boxShadow: cart.length > 0 && !cashInsufficient ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
            }}
          >
            {processing ? 'Processing…' : cart.length === 0 ? 'Add items to cart' : `Charge ${formatAmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
}
