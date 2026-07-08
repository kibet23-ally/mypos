import { useMemo } from 'react';
import type { NavItem, NavGroup, UserRole } from '@/types/index';
import {
  LayoutDashboard, Building2, Users, BarChart3, Settings,
  ShoppingCart, Package, FileText, UserCheck,
  History, User, Boxes, UserCircle2, Receipt,
  ClipboardList, Undo2, Tags, ArrowLeftRight, ClipboardCheck,
  Truck, Contact, Wallet, TrendingUp, PieChart,
  Store, Percent, Bell, KeyRound, Layers, ShieldCheck,
  Activity, SlidersHorizontal,
} from 'lucide-react';

// ── Owner: grouped SaaS-style navigation ──────────────────────────────────
const OWNER_GROUPS: NavGroup[] = [
  { heading: null, items: [
    { key: 'ow-overview', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { heading: 'Sales', items: [
    { key: 'ow-pos',            label: 'POS',            icon: ShoppingCart },
    { key: 'ow-sales-history',  label: 'Sales History',  icon: History },
    { key: 'ow-quotations',     label: 'Quotations',     icon: ClipboardList },
    { key: 'ow-invoices',       label: 'Invoices',       icon: Receipt },
    { key: 'ow-returns',        label: 'Returns',        icon: Undo2 },
  ]},
  { heading: 'Catalog', items: [
    { key: 'ow-products',   label: 'Products',   icon: Package },
    { key: 'ow-categories', label: 'Categories', icon: Tags },
  ]},
  { heading: 'Inventory', items: [
    { key: 'ow-inventory',         label: 'Inventory',          icon: Boxes },
    { key: 'ow-stock-movements',   label: 'Stock Movements',    icon: ArrowLeftRight },
    { key: 'ow-inventory-reports', label: 'Inventory Reports',  icon: ClipboardCheck },
    { key: 'ow-purchase-orders',   label: 'Purchase Orders',    icon: FileText },
    { key: 'ow-purchases',         label: 'Purchases',          icon: Truck },
    { key: 'ow-suppliers',         label: 'Suppliers',          icon: Contact },
  ]},
  { heading: 'Customers', items: [
    { key: 'ow-customers', label: 'Customers', icon: UserCircle2 },
  ]},
  { heading: 'Finance', items: [
    { key: 'ow-expenses',        label: 'Expenses',        icon: Wallet },
    { key: 'ow-profit-loss',     label: 'Profit & Loss',   icon: TrendingUp },
    { key: 'ow-revenue-reports', label: 'Revenue Reports', icon: PieChart },
    { key: 'ow-reports',         label: 'Reports Center',  icon: BarChart3 },
  ]},
  { heading: 'People', items: [
    { key: 'ow-staff', label: 'Staff Management', icon: UserCheck },
  ]},
  { heading: 'Settings', items: [
    { key: 'ow-settings',         label: 'Business Settings', icon: Store },
    { key: 'ow-receipt-settings', label: 'Receipt Settings',  icon: Receipt },
    { key: 'ow-tax-settings',     label: 'Tax Settings',      icon: Percent },
    { key: 'ow-notifications',    label: 'Notifications',     icon: Bell },
    { key: 'ow-profile',          label: 'Profile',           icon: User },
  ]},
];

// ── Superadmin: grouped navigation ─────────────────────────────────────────
const SUPERADMIN_GROUPS: NavGroup[] = [
  { heading: null, items: [
    { key: 'sa-overview', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { heading: 'Super Admin', items: [
    { key: 'sa-businesses',  label: 'Businesses',     icon: Building2 },
    { key: 'sa-licenses',    label: 'Licenses',       icon: KeyRound },
    { key: 'sa-plans',       label: 'Plans',          icon: Layers },
    { key: 'sa-users-roles', label: 'Users',          icon: Users },
    { key: 'sa-analytics',   label: 'Analytics',      icon: Activity },
    { key: 'sa-reports',     label: 'Reports',        icon: BarChart3 },
    { key: 'sa-settings',    label: 'System Settings', icon: SlidersHorizontal },
  ]},
];

// ── Cashier: small flat menu, no groups needed ─────────────────────────────
const CASHIER_GROUPS: NavGroup[] = [
  { heading: null, items: [
    { key: 'ca-overview', label: 'Dashboard',     icon: LayoutDashboard },
    { key: 'ca-pos',      label: 'Point of Sale', icon: ShoppingCart },
    { key: 'ca-products', label: 'Products',      icon: Package },
    { key: 'ca-invoices', label: 'Invoices',      icon: Receipt },
    { key: 'ca-history',  label: 'Sales History', icon: History },
    { key: 'ca-profile',  label: 'Profile',       icon: User },
  ]},
];

export function useNavGroups(role: UserRole | undefined): NavGroup[] {
  return useMemo(() => {
    switch (role) {
      case 'superadmin': return SUPERADMIN_GROUPS;
      case 'owner':      return OWNER_GROUPS;
      case 'cashier':    return CASHIER_GROUPS;
      default:           return [];
    }
  }, [role]);
}

/** Flat item list — kept for call sites that just need "all items for this role"
 *  (default-key selection, search, keyboard nav) without group structure. */
export function useNavItems(role: UserRole | undefined): NavItem[] {
  const groups = useNavGroups(role);
  return useMemo(() => groups.flatMap(g => g.items), [groups]);
}

export { OWNER_GROUPS, SUPERADMIN_GROUPS, CASHIER_GROUPS, ShieldCheck };
