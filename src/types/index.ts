import type { LucideIcon } from 'lucide-react';

export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

// ─── RBAC ───────────────────────────────────────────────────────────────────
export type UserRole = 'superadmin' | 'owner' | 'cashier';
export type LicenseStatus = 'pending' | 'active' | 'revoked';
export type BusinessType =
  | 'supermarket'
  | 'restaurant'
  | 'clothing'
  | 'pharmacy'
  | 'electronics'
  | 'salon'
  | 'general';

// ─── Database models ─────────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  business_name: string;
  business_type: BusinessType | null;
  license_key: string;
  is_activated: boolean;
  activated_at: string | null;
  onboarding_completed: boolean;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  created_at: string;
  updated_at: string;
}

// ─── Business template ───────────────────────────────────────────────────────
export interface BusinessTemplate {
  id: string;
  business_type: BusinessType;
  display_name: string;
  icon: string;
  description: string;
  default_categories: Array<{ name: string; sort_order: number }>;
  default_products: Array<{
    name: string; sku: string; price: number;
    cost_price: number; unit: string; category: string;
  }>;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  tenant_id: string | null;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentLicense {
  id: string;
  tenant_id: string;
  license_key: string;
  payment_reference: string | null;
  amount: number;
  status: LicenseStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Auth user (enriched) ────────────────────────────────────────────────────
export interface AppUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  tenant_id: string | null;
  branch_id: string | null;
  tenant?: Tenant | null;
  // Convenience flattened fields
  business_type?: BusinessType | null;
  onboarding_completed?: boolean;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
}

// ─── Sidebar navigation ───────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  icon: LucideIcon;
  key: string;
  badge?: string;
}

// ─── Registration payload ─────────────────────────────────────────────────────
export interface RegisterPayload {
  username: string;
  password: string;
  role: UserRole;
  business_name?: string;
  tenant_id?: string;
}

// ─── POS domain models ────────────────────────────────────────────────────────
export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost_price: number;
  tax_rate: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  product_id: string;
  quantity_on_hand: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  cashier_id: string;
  customer_id: string | null;
  receipt_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  change_due: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  subtotal: number;
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  total_purchases: number;
  total_spent: number;
  last_purchase_at: string | null;
  created_at: string;
  updated_at: string;
}
