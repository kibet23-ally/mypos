// ─── Invoice Module Types ────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'pending_payment'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'mpesa' | 'card' | 'bank_transfer' | 'other';
export type StockDeductionMode = 'on_create' | 'immediately' | 'on_full_payment';

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
  created_at: string;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  tenant_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  recorded_by: string | null;
  paid_at: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  customer_id: string;
  status: InvoiceStatus;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  balance_due: number;
  notes: string | null;
  payment_terms: string | null;
  due_date: string | null;
  issued_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // joined
  customer?: Customer;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
}

export interface InvoiceSettings {
  id: string;
  tenant_id: string;
  stock_deduction_mode: StockDeductionMode;
  default_tax_rate: number;
  default_payment_terms: string;
  next_invoice_seq: number;
}

// ─── Form / DTO types ─────────────────────────────────────────────────────────

export interface InvoiceItemDraft {
  _id: string; // local key
  product_id: string | null;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
}

export interface InvoiceDraft {
  customer_id: string;
  items: InvoiceItemDraft[];
  discount_amount: number;
  tax_rate: number;
  notes: string;
  payment_terms: string;
  due_date: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  pending_payment: 'Pending Payment',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<InvoiceStatus, { bg: string; text: string; border: string }> = {
  draft:           { bg: '#F8FAFC', text: '#64748B', border: '#CBD5E1' },
  sent:            { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  pending_payment: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  partially_paid:  { bg: '#EFF6FF', text: '#7C3AED', border: '#DDD6FE' },
  paid:            { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  overdue:         { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  cancelled:       { bg: '#F8FAFC', text: '#94A3B8', border: '#E2E8F0' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

export function fmt(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function calcItemTotal(item: InvoiceItemDraft): number {
  const base = item.quantity * item.unit_price;
  return base * (1 - item.discount_pct / 100);
}

export function calcTotals(items: InvoiceItemDraft[], discountAmount: number, taxRate: number) {
  const subtotal = items.reduce((s, i) => s + calcItemTotal(i), 0);
  const afterDiscount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = afterDiscount * taxRate;
  const total = afterDiscount + taxAmount;
  return { subtotal, taxAmount, total };
}
