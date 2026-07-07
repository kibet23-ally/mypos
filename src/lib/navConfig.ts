import { useMemo } from 'react';
<<<<<<< HEAD
import type { NavItem, UserRole } from '@/types/index';
import {
  LayoutDashboard, Building2, Users, BarChart3, Settings,
  ShoppingCart, Package, FileText, UserCheck,
  History, User, Boxes, UserCircle2, Receipt,
} from 'lucide-react';

const SUPERADMIN_NAV: NavItem[] = [
  { key: 'sa-overview',    label: 'Dashboard Overview',  icon: LayoutDashboard },
  { key: 'sa-businesses',  label: 'Businesses Registered', icon: Building2 },
  { key: 'sa-users-roles', label: 'Users & Roles',       icon: Users },
  { key: 'sa-reports',     label: 'Reports & Analytics', icon: BarChart3 },
  { key: 'sa-settings',    label: 'Settings',            icon: Settings },
];

const OWNER_NAV: NavItem[] = [
  { key: 'ow-overview',    label: 'Dashboard Overview',  icon: LayoutDashboard },
  { key: 'ow-pos',         label: 'Point of Sale',       icon: ShoppingCart },
  { key: 'ow-products',    label: 'Products',            icon: Package },
  { key: 'ow-inventory',   label: 'Inventory',           icon: Boxes },
  { key: 'ow-invoices',    label: 'Invoices',            icon: Receipt },
  { key: 'ow-customers',   label: 'Customers',           icon: UserCircle2 },
  { key: 'ow-reports',     label: 'Reports Center',      icon: FileText },
  { key: 'ow-staff',       label: 'Staff',               icon: UserCheck },
  { key: 'ow-settings',    label: 'Settings',            icon: Settings },
];

const CASHIER_NAV: NavItem[] = [
  { key: 'ca-overview',  label: 'Dashboard Overview', icon: LayoutDashboard },
  { key: 'ca-pos',       label: 'Point of Sale',      icon: ShoppingCart },
  { key: 'ca-products',  label: 'Products',           icon: Package },
  { key: 'ca-invoices',  label: 'Invoices',           icon: Receipt },
  { key: 'ca-history',   label: 'Sales History',      icon: History },
  { key: 'ca-profile',   label: 'Profile',            icon: User },
];

export function useNavItems(role: UserRole | undefined): NavItem[] {
  return useMemo(() => {
    switch (role) {
      case 'superadmin': return SUPERADMIN_NAV;
      case 'owner':      return OWNER_NAV;
      case 'cashier':    return CASHIER_NAV;
=======
import type { NavSection, UserRole } from '@/types/index';
import {
  LayoutDashboard, Building2, Users, BarChart3, Settings,
  ShoppingCart, Package, FileText, UserCheck, History,
  User, ShoppingBag, Truck, UserCog, Bell, Tag, Layers,
  ArrowLeftRight, TrendingUp, CreditCard, Receipt, Wallet,
  ClipboardList, FileBarChart, Globe, Mail, MessageSquare,
  PhoneCall, Landmark, ScrollText, Activity, Shield,
  Database, Wrench, ToggleLeft, AlertCircle, BookOpen,
  BadgeDollarSign, LineChart, Store, Key, RefreshCw,
} from 'lucide-react';

// ── Super Admin ───────────────────────────────────────────────────────────────
export const SUPERADMIN_SECTIONS: NavSection[] = [
  {
    key: 'sa-main',
    title: '',
    items: [
      { key: 'sa-overview', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    key: 'sa-tenants',
    title: 'Tenants',
    items: [
      { key: 'sa-businesses',          label: 'Businesses',          icon: Building2 },
      { key: 'sa-licenses',            label: 'Licenses',            icon: Key },
      { key: 'sa-subscription-plans',  label: 'Subscription Plans',  icon: CreditCard },
      { key: 'sa-payments',            label: 'Payments',            icon: Wallet },
      { key: 'sa-trial-mgmt',          label: 'Trial Management',    icon: ToggleLeft },
    ],
  },
  {
    key: 'sa-users-section',
    title: 'Users',
    items: [
      { key: 'sa-system-users', label: 'System Users',       icon: Users },
      { key: 'sa-users-roles',  label: 'Roles & Permissions', icon: Shield },
    ],
  },
  {
    key: 'sa-monitoring',
    title: 'Business Monitoring',
    items: [
      { key: 'sa-active-businesses',    label: 'Active Businesses',    icon: Store },
      { key: 'sa-suspended-businesses', label: 'Suspended Businesses', icon: AlertCircle },
      { key: 'sa-login-activity',       label: 'Login Activity',       icon: Activity },
    ],
  },
  {
    key: 'sa-reports',
    title: 'Reports',
    items: [
      { key: 'sa-revenue',                label: 'Revenue',                icon: BarChart3 },
      { key: 'sa-subscription-reports',   label: 'Subscription Reports',   icon: FileBarChart },
      { key: 'sa-usage-analytics',        label: 'Usage Analytics',        icon: LineChart },
      { key: 'sa-system-analytics',       label: 'System Analytics',       icon: TrendingUp },
    ],
  },
  {
    key: 'sa-communication',
    title: 'Communication',
    items: [
      { key: 'sa-notifications', label: 'Notifications', icon: Bell },
      { key: 'sa-announcements', label: 'Announcements', icon: MessageSquare },
    ],
  },
  {
    key: 'sa-system',
    title: 'System',
    items: [
      { key: 'sa-integrations',      label: 'Integrations',      icon: Globe },
      { key: 'sa-tax-config',        label: 'Tax Configuration',  icon: BadgeDollarSign },
      { key: 'sa-receipt-templates', label: 'Receipt Templates',  icon: Receipt },
      { key: 'sa-email-settings',    label: 'Email Settings',     icon: Mail },
      { key: 'sa-sms-settings',      label: 'SMS Settings',       icon: MessageSquare },
      { key: 'sa-whatsapp-settings', label: 'WhatsApp Settings',  icon: PhoneCall },
      { key: 'sa-payment-gateways',  label: 'Payment Gateways',   icon: Landmark },
      { key: 'sa-mpesa-config',      label: 'M-Pesa Configuration', icon: CreditCard },
    ],
  },
  {
    key: 'sa-administration',
    title: 'Administration',
    items: [
      { key: 'sa-audit-logs',    label: 'Audit Logs',     icon: ScrollText },
      { key: 'sa-activity-logs', label: 'Activity Logs',  icon: Activity },
      { key: 'sa-backup-restore',label: 'Backup & Restore', icon: Database },
      { key: 'sa-settings',      label: 'System Settings', icon: Settings },
    ],
  },
];

// ── Owner ─────────────────────────────────────────────────────────────────────
export const OWNER_SECTIONS: NavSection[] = [
  {
    key: 'ow-main',
    title: '',
    items: [
      { key: 'ow-overview', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    key: 'ow-sales',
    title: 'Sales',
    items: [
      { key: 'ow-pos',          label: 'POS Sales',     icon: ShoppingCart },
      { key: 'ow-sales-history',label: 'Sales History', icon: History },
      { key: 'ow-quotations',   label: 'Quotations',    icon: ClipboardList, comingSoon: true },
      { key: 'ow-invoices',     label: 'Invoices',      icon: FileText, comingSoon: true },
      { key: 'ow-returns',      label: 'Returns',       icon: RefreshCw, comingSoon: true },
    ],
  },
  {
    key: 'ow-inventory',
    title: 'Inventory',
    items: [
      { key: 'ow-products',           label: 'Products',          icon: Package },
      { key: 'ow-categories',         label: 'Categories',        icon: Tag },
      { key: 'ow-inventory',          label: 'Inventory',         icon: Layers },
      { key: 'ow-stock-movements',    label: 'Stock Movements',   icon: ArrowLeftRight, comingSoon: true },
      { key: 'ow-inventory-reports',  label: 'Inventory Reports', icon: FileBarChart, comingSoon: true },
    ],
  },
  {
    key: 'ow-contacts',
    title: 'Customers & Suppliers',
    items: [
      { key: 'ow-customers', label: 'Customers', icon: Users },
      { key: 'ow-suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    key: 'ow-purchasing',
    title: 'Purchasing',
    items: [
      { key: 'ow-purchases',       label: 'Purchases',       icon: ShoppingBag, comingSoon: true },
      { key: 'ow-purchase-orders', label: 'Purchase Orders', icon: BookOpen, comingSoon: true },
    ],
  },
  {
    key: 'ow-finance',
    title: 'Finance',
    items: [
      { key: 'ow-expenses',        label: 'Expenses',       icon: Wallet, comingSoon: true },
      { key: 'ow-profit-loss',     label: 'Profit & Loss',  icon: TrendingUp },
      { key: 'ow-revenue-reports', label: 'Revenue Reports', icon: BarChart3 },
    ],
  },
  {
    key: 'ow-staff-section',
    title: 'Staff',
    items: [
      { key: 'ow-staff', label: 'Staff Management',  icon: UserCheck },
      { key: 'ow-users', label: 'Roles & Permissions', icon: Shield },
    ],
  },
  {
    key: 'ow-comms',
    title: 'Communication',
    items: [
      { key: 'ow-notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    key: 'ow-settings-section',
    title: 'Settings',
    items: [
      { key: 'ow-settings',              label: 'Business Settings',    icon: Settings },
      { key: 'ow-receipt-settings',      label: 'Receipt Settings',     icon: Receipt, comingSoon: true },
      { key: 'ow-tax-settings',          label: 'Tax Settings',         icon: BadgeDollarSign, comingSoon: true },
      { key: 'ow-integrations-settings', label: 'Integrations',         icon: Globe, comingSoon: true },
      { key: 'ow-license-subscription',  label: 'License & Subscription', icon: Key, comingSoon: true },
    ],
  },
];

// ── Manager ───────────────────────────────────────────────────────────────────
export const MANAGER_SECTIONS: NavSection[] = [
  {
    key: 'mg-main',
    title: '',
    items: [
      { key: 'mg-overview', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    key: 'mg-sales',
    title: 'Sales',
    items: [
      { key: 'mg-pos',          label: 'POS Sales',     icon: ShoppingCart },
      { key: 'mg-sales-history',label: 'Sales History', icon: History },
      { key: 'mg-quotations',   label: 'Quotations',    icon: ClipboardList, comingSoon: true },
      { key: 'mg-invoices',     label: 'Invoices',      icon: FileText, comingSoon: true },
      { key: 'mg-returns',      label: 'Returns',       icon: RefreshCw, comingSoon: true },
    ],
  },
  {
    key: 'mg-inventory',
    title: 'Inventory',
    items: [
      { key: 'mg-products',          label: 'Products',          icon: Package },
      { key: 'mg-categories',        label: 'Categories',        icon: Tag },
      { key: 'mg-inventory',         label: 'Inventory',         icon: Layers },
      { key: 'mg-stock-movements',   label: 'Stock Movements',   icon: ArrowLeftRight, comingSoon: true },
      { key: 'mg-inventory-reports', label: 'Inventory Reports', icon: FileBarChart, comingSoon: true },
    ],
  },
  {
    key: 'mg-contacts',
    title: 'Customers & Suppliers',
    items: [
      { key: 'mg-customers', label: 'Customers', icon: Users },
      { key: 'mg-suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    key: 'mg-purchasing',
    title: 'Purchasing',
    items: [
      { key: 'mg-purchases', label: 'Purchases', icon: ShoppingBag, comingSoon: true },
    ],
  },
  {
    key: 'mg-finance',
    title: 'Finance',
    items: [
      { key: 'mg-expenses',        label: 'Expenses',        icon: Wallet, comingSoon: true },
      { key: 'mg-revenue-reports', label: 'Revenue Reports', icon: BarChart3 },
    ],
  },
  {
    key: 'mg-comms',
    title: 'Communication',
    items: [
      { key: 'mg-notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

// ── Cashier ───────────────────────────────────────────────────────────────────
export const CASHIER_SECTIONS: NavSection[] = [
  {
    key: 'ca-main',
    title: '',
    items: [
      { key: 'ca-overview', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    key: 'ca-sales',
    title: 'Sales',
    items: [
      { key: 'ca-pos',     label: 'POS Sales',     icon: ShoppingCart },
      { key: 'ca-history', label: 'Sales History', icon: History },
    ],
  },
  {
    key: 'ca-contacts',
    title: 'Customers',
    items: [
      { key: 'ca-customers', label: 'Customers', icon: Users },
    ],
  },
  {
    key: 'ca-invoices-section',
    title: 'Invoices',
    items: [
      { key: 'ca-invoices',        label: 'View Invoices',    icon: FileText, comingSoon: true },
      { key: 'ca-record-payments', label: 'Record Payments',  icon: CreditCard, comingSoon: true },
    ],
  },
  {
    key: 'ca-comms',
    title: '',
    items: [
      { key: 'ca-notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNavSections(role: UserRole | undefined): NavSection[] {
  return useMemo(() => {
    switch (role) {
      case 'superadmin': return SUPERADMIN_SECTIONS;
      case 'owner':      return OWNER_SECTIONS;
      case 'manager':    return MANAGER_SECTIONS;
      case 'cashier':    return CASHIER_SECTIONS;
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
      default:           return [];
    }
  }, [role]);
}

<<<<<<< HEAD
export { SUPERADMIN_NAV, OWNER_NAV, CASHIER_NAV };
=======
/** Flatten all items from all sections — used by DashboardPage for VIEW_MAP lookup */
export function flattenNavItems(sections: NavSection[]) {
  return sections.flatMap(s => s.items);
}

// Legacy flat exports kept for backward compatibility
import type { NavItem } from '@/types/index';
export const SUPERADMIN_NAV: NavItem[] = SUPERADMIN_SECTIONS.flatMap(s => s.items);
export const OWNER_NAV: NavItem[]      = OWNER_SECTIONS.flatMap(s => s.items);
export const CASHIER_NAV: NavItem[]    = CASHIER_SECTIONS.flatMap(s => s.items);
export function useNavItems(role: UserRole | undefined): NavItem[] {
  return useMemo(() => {
    switch (role) {
      case 'superadmin': return SUPERADMIN_NAV;
      case 'owner':      return OWNER_NAV;
      case 'manager':    return MANAGER_SECTIONS.flatMap(s => s.items);
      case 'cashier':    return CASHIER_NAV;
      default:           return [];
    }
  }, [role]);
}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
