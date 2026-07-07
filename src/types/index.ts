import type { LucideIcon } from 'lucide-react';

export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

// ─── RBAC ───────────────────────────────────────────────────────────────────
export type UserRole = 'superadmin' | 'owner' | 'manager' | 'cashier';
export type LicenseStatus = 'pending' | 'active' | 'revoked';

// ─── Database models ─────────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  business_name: string;
  license_key: string;
  is_activated: boolean;
  activated_at: string | null;
  /** Sales tax rate as a percentage, e.g. 8.5 means 8.5%. Always sourced from the database — never hardcoded. */
  tax_rate: number;
  /** ISO currency code for this tenant, e.g. 'KES', 'USD'. Used by useCurrency() for all money formatting. */
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  email: string;
  /** Contact phone collected at registration. */
  phone_number: string | null;
  /** Person's legal/full name stored in the `full_name` DB column. */
  full_name: string | null;
  /** Legacy display label stored in the `display_name` DB column (older accounts). */
  display_name: string | null;
  role: UserRole;
  tenant_id: string | null;
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
  phone_number: string | null;
  /** Preferred display name — falls back to full_name, then username, in UI code. */
  display_name: string | null;
  role: UserRole;
  tenant_id: string | null;
  tenant?: Tenant | null;
}

// ─── Sidebar navigation ───────────────────────────────────────────────────────
export interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  key: string;
  badge?: string;
  comingSoon?: boolean;
}

// ─── Registration payload ─────────────────────────────────────────────────────
export interface RegisterPayload {
  full_name: string;
  username: string;
  email: string;
  phone_number: string;
  password: string;
  role: UserRole;
  business_name?: string;
  tenant_id?: string;
}
