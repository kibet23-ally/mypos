import { useMemo } from 'react';
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
      default:           return [];
    }
  }, [role]);
}

export { SUPERADMIN_NAV, OWNER_NAV, CASHIER_NAV };
