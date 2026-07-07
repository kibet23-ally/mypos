import { supabase } from '@/db/supabase';
import type {
  Invoice, InvoiceItem, InvoicePayment, Customer,
  InvoiceDraft, InvoiceItemDraft, InvoiceSettings, PaymentMethod,
} from '@/types/invoice';
import { calcItemTotal, calcTotals } from '@/types/invoice';

// ─── Customers ────────────────────────────────────────────────────────────────
export async function fetchCustomers(tenantId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCustomer(
  tenantId: string, userId: string,
  payload: { name: string; email?: string; phone?: string; address?: string; notes?: string }
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...payload, tenant_id: tenantId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, payload: Partial<Customer>): Promise<void> {
  const { error } = await supabase.from('customers').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ─── Invoice Settings ─────────────────────────────────────────────────────────
export async function fetchInvoiceSettings(tenantId: string): Promise<InvoiceSettings | null> {
  const { data } = await supabase
    .from('invoice_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return data;
}

export async function upsertInvoiceSettings(
  tenantId: string, payload: Partial<InvoiceSettings>
): Promise<void> {
  const { error } = await supabase
    .from('invoice_settings')
    .upsert({ ...payload, tenant_id: tenantId }, { onConflict: 'tenant_id' });
  if (error) throw error;
}

// ─── Invoice Number ───────────────────────────────────────────────────────────
export async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_invoice_number', { p_tenant_id: tenantId });
  if (error) throw error;
  return data as string;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export async function fetchInvoices(tenantId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customer:customers(*)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customer:customers(*), items:invoice_items(*), payments:invoice_payments(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createInvoice(
  tenantId: string,
  userId: string,
  draft: InvoiceDraft,
  asDraft: boolean
): Promise<Invoice> {
  const invoiceNumber = await generateInvoiceNumber(tenantId);
  const { subtotal, taxAmount, total } = calcTotals(draft.items, draft.discount_amount, draft.tax_rate);
  const status = asDraft ? 'draft' : 'sent';

  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      customer_id: draft.customer_id,
      status,
      subtotal,
      discount_amount: draft.discount_amount,
      tax_rate: draft.tax_rate,
      tax_amount: taxAmount,
      total,
      balance_due: total,
      notes: draft.notes || null,
      payment_terms: draft.payment_terms || null,
      due_date: draft.due_date || null,
      issued_at: asDraft ? null : new Date().toISOString(),
      created_by: userId,
    })
    .select()
    .single();
  if (invErr) throw invErr;

  const itemRows = draft.items.map((item: InvoiceItemDraft) => ({
    invoice_id: inv.id,
    product_id: item.product_id || null,
    name: item.name,
    sku: item.sku || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_pct: item.discount_pct,
    line_total: calcItemTotal(item),
  }));

  const { error: itemsErr } = await supabase.from('invoice_items').insert(itemRows);
  if (itemsErr) throw itemsErr;

  // Deduct stock if mode is 'immediately' or 'on_create'
  const settings = await fetchInvoiceSettings(tenantId);
  const mode = settings?.stock_deduction_mode ?? 'immediately';
  if (mode === 'immediately' || (mode === 'on_create' && !asDraft)) {
    await deductStock(draft.items);
  }

  return inv;
}

export async function updateInvoice(
  id: string,
  userId: string,
  draft: InvoiceDraft
): Promise<void> {
  const { subtotal, taxAmount, total } = calcTotals(draft.items, draft.discount_amount, draft.tax_rate);

  // get current paid amount
  const existing = await fetchInvoiceById(id);
  const paidAmount = existing?.paid_amount ?? 0;
  const balanceDue = Math.max(total - paidAmount, 0);

  const { error: invErr } = await supabase.from('invoices').update({
    customer_id: draft.customer_id,
    subtotal,
    discount_amount: draft.discount_amount,
    tax_rate: draft.tax_rate,
    tax_amount: taxAmount,
    total,
    balance_due: balanceDue,
    notes: draft.notes || null,
    payment_terms: draft.payment_terms || null,
    due_date: draft.due_date || null,
    updated_by: userId,
  }).eq('id', id);
  if (invErr) throw invErr;

  // replace items
  await supabase.from('invoice_items').delete().eq('invoice_id', id);
  const itemRows = draft.items.map((item: InvoiceItemDraft) => ({
    invoice_id: id,
    product_id: item.product_id || null,
    name: item.name,
    sku: item.sku || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_pct: item.discount_pct,
    line_total: calcItemTotal(item),
  }));
  const { error: itemsErr } = await supabase.from('invoice_items').insert(itemRows);
  if (itemsErr) throw itemsErr;
}

export async function issueInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').update({
    status: 'sent',
    issued_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function cancelInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function duplicateInvoice(
  invoice: Invoice,
  tenantId: string,
  userId: string
): Promise<Invoice> {
  const draft: InvoiceDraft = {
    customer_id: invoice.customer_id,
    items: (invoice.items ?? []).map(item => ({
      _id: crypto.randomUUID(),
      product_id: item.product_id,
      name: item.name,
      sku: item.sku ?? '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_pct: item.discount_pct,
    })),
    discount_amount: invoice.discount_amount,
    tax_rate: invoice.tax_rate,
    notes: invoice.notes ?? '',
    payment_terms: invoice.payment_terms ?? '',
    due_date: '',
  };
  return createInvoice(tenantId, userId, draft, true);
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export async function recordPayment(
  invoiceId: string,
  tenantId: string,
  userId: string,
  amount: number,
  method: PaymentMethod,
  reference?: string,
  notes?: string
): Promise<InvoicePayment> {
  const { data, error } = await supabase
    .from('invoice_payments')
    .insert({
      invoice_id: invoiceId,
      tenant_id: tenantId,
      amount,
      method,
      reference: reference || null,
      notes: notes || null,
      recorded_by: userId,
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  // Check if fully paid → create sales record + deduct stock if mode = on_full_payment
  const invoice = await fetchInvoiceById(invoiceId);
  if (invoice && invoice.status === 'paid') {
    await createSaleFromInvoice(invoice, tenantId, userId, method);
    const settings = await fetchInvoiceSettings(tenantId);
    if (settings?.stock_deduction_mode === 'on_full_payment') {
      await deductStock(
        (invoice.items ?? []).map(i => ({
          _id: i.id, product_id: i.product_id, name: i.name, sku: i.sku ?? '',
          quantity: i.quantity, unit_price: i.unit_price, discount_pct: i.discount_pct,
        }))
      );
    }
  }
  return data;
}

export async function fetchPaymentsForInvoice(invoiceId: string): Promise<InvoicePayment[]> {
  const { data, error } = await supabase
    .from('invoice_payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('paid_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Sales Integration ────────────────────────────────────────────────────────
async function createSaleFromInvoice(
  invoice: Invoice,
  tenantId: string,
  userId: string,
  method: PaymentMethod
): Promise<void> {
  // prevent duplicates
  const { data: existing } = await supabase
    .from('sales')
    .select('id')
    .eq('invoice_id', invoice.id)
    .maybeSingle();
  if (existing) return;

  await supabase.from('sales').insert({
    tenant_id: tenantId,
    invoice_id: invoice.id,
    total: invoice.total,
    payment_method: method,
    created_by: userId,
  });
}

// ─── Stock Deduction ──────────────────────────────────────────────────────────
async function deductStock(items: InvoiceItemDraft[]): Promise<void> {
  for (const item of items) {
    if (!item.product_id) continue;
    await supabase.rpc('decrement_product_stock', {
      p_product_id: item.product_id,
      p_qty: item.quantity,
    }).then(); // best-effort — ignore errors silently
  }
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export async function fetchInvoiceReportData(tenantId: string) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, status, total, paid_amount, balance_due, due_date, created_at, customer:customers(name)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((invoices ?? []) as unknown) as Array<Invoice & { customer: { name: string } }>;

  const totalInvoiced   = rows.reduce((s, r) => s + r.total, 0);
  const totalPaid       = rows.reduce((s, r) => s + r.paid_amount, 0);
  const totalOutstanding = rows.reduce((s, r) => s + r.balance_due, 0);
  const overdueRows     = rows.filter(r => r.status === 'overdue');
  const paidRows        = rows.filter(r => r.status === 'paid');

  const now = new Date();
  const aging30  = rows.filter(r => r.balance_due > 0 && daysOverdue(r.due_date) <= 30);
  const aging60  = rows.filter(r => r.balance_due > 0 && daysOverdue(r.due_date) > 30 && daysOverdue(r.due_date) <= 60);
  const aging90  = rows.filter(r => r.balance_due > 0 && daysOverdue(r.due_date) > 60);

  return {
    rows,
    summary: {
      totalInvoiced, totalPaid, totalOutstanding,
      overdueCount: overdueRows.length,
      overdueAmount: overdueRows.reduce((s, r) => s + r.balance_due, 0),
      paidCount: paidRows.length,
      totalCount: rows.length,
    },
    aging: {
      within30: { count: aging30.length, amount: aging30.reduce((s, r) => s + r.balance_due, 0) },
      between3160: { count: aging60.length, amount: aging60.reduce((s, r) => s + r.balance_due, 0) },
      over60: { count: aging90.length, amount: aging90.reduce((s, r) => s + r.balance_due, 0) },
    },
  };
}

function daysOverdue(dueDateStr: string | null): number {
  if (!dueDateStr) return 0;
  const diff = (Date.now() - new Date(dueDateStr).getTime()) / 86400000;
  return Math.max(0, Math.floor(diff));
}

// ─── Customer invoice profile ─────────────────────────────────────────────────
export async function fetchCustomerInvoiceSummary(customerId: string) {
  const { data } = await supabase
    .from('invoices')
    .select('id, status, total, paid_amount, balance_due, due_date, invoice_number, created_at')
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const rows = ((data ?? []) as unknown) as Invoice[];
  return {
    rows: rows as Invoice[],
    totalInvoices: rows.length,
    paidInvoices: rows.filter((r: Invoice) => r.status === 'paid').length,
    overdueInvoices: rows.filter((r: Invoice) => r.status === 'overdue').length,
    outstandingBalance: rows.reduce((s: number, r: Invoice) => s + r.balance_due, 0),
  };
}
