import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/use-debounce';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search, Plus, Trash2, ChevronDown, Package, User, UserPlus,
  ArrowLeft, Save, Send, AlertCircle,
} from 'lucide-react';
import { createInvoice, updateInvoice, fetchCustomers, createCustomer, fetchInvoiceById, fetchInvoiceSettings } from '@/services/invoiceService';
import type { InvoiceItemDraft, InvoiceDraft, Customer } from '@/types/invoice';
import { calcItemTotal, calcTotals, fmt } from '@/types/invoice';

const inputClass = 'h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3';
const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };

interface Product { id: string; name: string; sku: string; price: number; stock: number; category: string; }

interface Props {
  editId?: string | null;
  onCancel: () => void;
  onSaved: (invoiceId: string) => void;
}

function newItem(): InvoiceItemDraft {
  return { _id: crypto.randomUUID(), product_id: null, name: '', sku: '', quantity: 1, unit_price: 0, discount_pct: 0 };
}

export default function InvoiceForm({ editId, onCancel, onSaved }: Props) {
  const { appUser } = useAuth();
  const tenantId = appUser?.tenant_id ?? '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<InvoiceItemDraft[]>([newItem()]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(0.16);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 30 days');
  const [dueDate, setDueDate] = useState('');

  // Product search per-row
  const [productSearches, setProductSearches] = useState<Record<string, string>>({});
  const [productDropdowns, setProductDropdowns] = useState<Record<string, boolean>>({});

  // New customer dialog
  const [custDialogOpen, setCustDialogOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', email: '', phone: '', address: '' });
  const [savingCust, setSavingCust] = useState(false);

  const [saving, setSaving] = useState(false);
  const isEdit = !!editId;

  // Load base data
  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      fetchCustomers(tenantId),
      supabase.from('products').select('*').eq('tenant_id', tenantId).order('name'),
      fetchInvoiceSettings(tenantId),
    ]).then(([custs, { data: prods }, settings]) => {
      setCustomers(custs);
      setProducts(prods ?? []);
      if (settings) { setTaxRate(settings.default_tax_rate); setPaymentTerms(settings.default_payment_terms); }
      setLoadingData(false);
    });
  }, [tenantId]);

  // Load invoice for editing
  useEffect(() => {
    if (!editId) return;
    fetchInvoiceById(editId).then(inv => {
      if (!inv) return;
      setCustomerId(inv.customer_id);
      setDiscountAmount(inv.discount_amount);
      setTaxRate(inv.tax_rate);
      setNotes(inv.notes ?? '');
      setPaymentTerms(inv.payment_terms ?? '');
      setDueDate(inv.due_date ?? '');
      if (inv.items?.length) {
        setItems(inv.items.map(i => ({
          _id: i.id, product_id: i.product_id, name: i.name, sku: i.sku ?? '',
          quantity: i.quantity, unit_price: i.unit_price, discount_pct: i.discount_pct,
        })));
      }
    });
  }, [editId]);

  const { subtotal, taxAmount, total } = useMemo(
    () => calcTotals(items, discountAmount, taxRate),
    [items, discountAmount, taxRate]
  );

  const updateItem = (id: string, field: keyof InvoiceItemDraft, value: string | number | null) => {
    setItems(prev => prev.map(i => i._id === id ? { ...i, [field]: value } : i));
  };

  const selectProduct = (itemId: string, product: Product) => {
    setItems(prev => prev.map(i => i._id === itemId
      ? { ...i, product_id: product.id, name: product.name, sku: product.sku, unit_price: product.price }
      : i));
    setProductSearches(prev => ({ ...prev, [itemId]: '' }));
    setProductDropdowns(prev => ({ ...prev, [itemId]: false }));
  };

  const filteredProducts = (itemId: string) => {
    const q = (productSearches[itemId] ?? '').toLowerCase();
    if (!q) return products.slice(0, 8);
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 8);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim()) { toast.error('Customer name required'); return; }
    setSavingCust(true);
    try {
      const cust = await createCustomer(tenantId, appUser!.id, newCust);
      setCustomers(prev => [...prev, cust]);
      setCustomerId(cust.id);
      setCustDialogOpen(false);
      setNewCust({ name: '', email: '', phone: '', address: '' });
      toast.success('Customer created');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSavingCust(false); }
  };

  const handleSave = async (asDraft: boolean) => {
    if (!customerId) { toast.error('Please select a customer'); return; }
    const validItems = items.filter(i => i.name.trim() && i.quantity > 0 && i.unit_price >= 0);
    if (!validItems.length) { toast.error('Add at least one item with name, quantity and price'); return; }
    if (!appUser?.id || !tenantId) return;

    setSaving(true);
    const draft: InvoiceDraft = {
      customer_id: customerId, items: validItems,
      discount_amount: discountAmount, tax_rate: taxRate,
      notes, payment_terms: paymentTerms, due_date: dueDate,
    };
    try {
      if (isEdit && editId) {
        await updateInvoice(editId, appUser.id, draft);
        toast.success('Invoice updated');
        onSaved(editId);
      } else {
        const inv = await createInvoice(tenantId, appUser.id, draft, asDraft);
        toast.success(asDraft ? 'Draft saved' : 'Invoice issued');
        onSaved(inv.id);
      }
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (loadingData) return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full bg-slate-100 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h2>
          <p className="text-sm text-slate-500">{isEdit ? 'Update invoice details' : 'Create a new invoice'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Customer + Items */}
        <div className="xl:col-span-2 space-y-5">
          {/* Customer Selection */}
          <Card className="border" style={CARD_STYLE}>
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-10 bg-slate-50 border-slate-200 rounded-xl">
                      <SelectValue placeholder="Select a customer…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {customers.length === 0
                        ? <div className="p-3 text-xs text-slate-400 text-center">No customers yet. Add one →</div>
                        : customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="font-medium">{c.name}</span>
                            {c.phone && <span className="text-slate-400 ml-2 text-xs">{c.phone}</span>}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <button onClick={() => setCustDialogOpen(true)} title="Add new customer"
                  className="h-10 px-3 rounded-xl border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1.5 text-sm shrink-0">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden md:inline">New</span>
                </button>
              </div>
              {customerId && (() => {
                const c = customers.find(x => x.id === customerId);
                if (!c) return null;
                return (
                  <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 grid grid-cols-2 gap-2">
                    {[['Email', c.email], ['Phone', c.phone], ['Address', c.address]].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l as string}>
                        <p className="text-xs text-slate-400">{l}</p>
                        <p className="text-xs font-medium text-slate-700">{v}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border" style={CARD_STYLE}>
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" /> Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {items.map((item, idx) => (
                <div key={item._id} className="rounded-xl border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 shrink-0">#{idx + 1}</span>
                    {/* Product search */}
                    <div className="flex-1 min-w-0 relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                          placeholder={item.name || 'Search product or type name…'}
                          value={productSearches[item._id] ?? ''}
                          onChange={e => {
                            setProductSearches(prev => ({ ...prev, [item._id]: e.target.value }));
                            setProductDropdowns(prev => ({ ...prev, [item._id]: true }));
                            if (e.target.value === '') updateItem(item._id, 'name', '');
                          }}
                          onFocus={() => setProductDropdowns(prev => ({ ...prev, [item._id]: true }))}
                          onBlur={() => setTimeout(() => setProductDropdowns(prev => ({ ...prev, [item._id]: false })), 200)}
                          className="pl-9 h-9 bg-slate-50 border-slate-200 rounded-xl text-sm px-3"
                        />
                      </div>
                      {productDropdowns[item._id] && filteredProducts(item._id).length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                          {filteredProducts(item._id).map(p => (
                            <button key={p.id} type="button"
                              onMouseDown={() => selectProduct(item._id, p)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                                <p className="text-xs text-slate-400">{p.sku}</p>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <p className="text-xs font-semibold text-blue-600">{fmt(p.price)}</p>
                                <p className="text-xs text-slate-400">Stock: {p.stock}</p>
                              </div>
                            </button>
                          ))}
                          <button type="button"
                            onMouseDown={() => {
                              updateItem(item._id, 'name', productSearches[item._id] ?? '');
                              setProductDropdowns(prev => ({ ...prev, [item._id]: false }));
                            }}
                            className="w-full px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 text-left border-t border-slate-100">
                            + Use "{productSearches[item._id]}" as custom item
                          </button>
                        </div>
                      )}
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => setItems(prev => prev.filter(i => i._id !== item._id))}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>

                  {/* Name if custom */}
                  {!item.product_id && (
                    <Input value={item.name} onChange={e => updateItem(item._id, 'name', e.target.value)}
                      placeholder="Item description" className={`${inputClass} text-sm`} />
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Qty</Label>
                      <Input type="number" min="0.01" step="0.01"
                        value={item.quantity}
                        onChange={e => updateItem(item._id, 'quantity', parseFloat(e.target.value) || 0)}
                        className={`${inputClass} text-sm`} />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Unit Price (KSh)</Label>
                      <Input type="number" min="0" step="0.01"
                        value={item.unit_price}
                        onChange={e => updateItem(item._id, 'unit_price', parseFloat(e.target.value) || 0)}
                        className={`${inputClass} text-sm`} />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Disc %</Label>
                      <Input type="number" min="0" max="100" step="0.1"
                        value={item.discount_pct}
                        onChange={e => updateItem(item._id, 'discount_pct', parseFloat(e.target.value) || 0)}
                        className={`${inputClass} text-sm`} />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <span className="text-sm font-bold text-slate-900">
                      Line Total: {fmt(calcItemTotal(item))}
                    </span>
                  </div>
                </div>
              ))}

              <button onClick={() => setItems(prev => [...prev, newItem()])}
                className="w-full h-10 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Add Line Item
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Totals + Details */}
        <div className="space-y-5">
          {/* Totals */}
          <Card className="border" style={CARD_STYLE}>
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">{fmt(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm text-slate-500 shrink-0">Discount (KSh)</Label>
                  <Input type="number" min="0" step="0.01" value={discountAmount}
                    onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="h-8 w-32 bg-slate-50 border-slate-200 rounded-xl px-2 text-sm text-right" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm text-slate-500 shrink-0">Tax Rate (%)</Label>
                  <Input type="number" min="0" max="100" step="0.1"
                    value={(taxRate * 100).toFixed(1)}
                    onChange={e => setTaxRate((parseFloat(e.target.value) || 0) / 100)}
                    className="h-8 w-32 bg-slate-50 border-slate-200 rounded-xl px-2 text-sm text-right" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                  <span className="text-slate-700">{fmt(taxAmount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between">
                  <span className="text-base font-bold text-slate-900">Total</span>
                  <span className="text-base font-bold text-blue-600">{fmt(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="border" style={CARD_STYLE}>
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Details</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Payment Terms</Label>
                <Input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 30" className={inputClass} />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional notes for the customer…" rows={3}
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl px-3 py-2 text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {!isEdit && (
              <button onClick={() => handleSave(true)} disabled={saving}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-60">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
            )}
            <button onClick={() => handleSave(false)} disabled={saving}
              className="w-full h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity"
              style={{ background: '#2563EB' }}>
              <Send className="w-4 h-4" />
              {saving ? 'Saving…' : isEdit ? 'Update Invoice' : 'Issue Invoice'}
            </button>
            <button onClick={onCancel}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-500 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* New Customer Dialog */}
      <Dialog open={custDialogOpen} onOpenChange={setCustDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4 mt-2">
            {[
              { label: 'Name *', key: 'name', placeholder: 'John Doe', type: 'text' },
              { label: 'Email', key: 'email', placeholder: 'john@example.com', type: 'email' },
              { label: 'Phone', key: 'phone', placeholder: '+254700000000', type: 'tel' },
              { label: 'Address', key: 'address', placeholder: 'Nairobi, Kenya', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{f.label}</Label>
                <Input type={f.type} placeholder={f.placeholder}
                  value={(newCust as Record<string, string>)[f.key]}
                  onChange={e => setNewCust(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className={inputClass} />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setCustDialogOpen(false)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm bg-white hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={savingCust}
                className="flex-1 h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: '#2563EB' }}>
                {savingCust ? 'Saving…' : 'Add Customer'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
