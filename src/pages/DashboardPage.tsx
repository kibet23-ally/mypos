import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useNavItems } from '@/lib/navConfig';
import { canAccessView } from '@/components/common/RouteGuard';
import { DashboardNavContext } from '@/contexts/DashboardNavContext';
import { ShieldOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy-loaded views for code splitting
const SAOverview    = lazy(() => import('./superadmin/SAOverview'));
const SABusinesses  = lazy(() => import('./superadmin/SABusinesses'));
const SAUsersRoles  = lazy(() => import('./superadmin/SAUsersRoles'));
const SAReports     = lazy(() => import('./superadmin/SAReports'));
const SASettings    = lazy(() => import('./superadmin/SASettings'));
const SALicenses    = lazy(() => import('./superadmin/SALicenses'));
const SASubscriptionPlans = lazy(() => import('./superadmin/SASubscriptionPlans'));
const SASystemAnalytics   = lazy(() => import('./superadmin/SASystemAnalytics'));
const OWOverview    = lazy(() => import('./owner/OWOverview'));
const OWPOS         = lazy(() => import('./owner/OWPOS'));
const OWProducts    = lazy(() => import('./owner/OWProducts'));
const OWCategories  = lazy(() => import('./owner/OWCategories'));
const OWInventory   = lazy(() => import('./owner/OWInventory'));
const OWStockMovements   = lazy(() => import('./owner/OWStockMovements'));
const OWInventoryReports = lazy(() => import('./owner/OWInventoryReports'));
const OWPurchaseOrders   = lazy(() => import('./owner/OWPurchaseOrders'));
const OWPurchases        = lazy(() => import('./owner/OWPurchases'));
const OWSuppliers        = lazy(() => import('./owner/OWSuppliers'));
const OWInvoices    = lazy(() => import('./owner/OWInvoices'));
const OWSalesHistory = lazy(() => import('./owner/OWSalesHistory'));
const OWQuotations   = lazy(() => import('./owner/OWQuotations'));
const OWReturns      = lazy(() => import('./owner/OWReturns'));
const OWCustomers   = lazy(() => import('./owner/OWCustomers'));
const OWExpenses     = lazy(() => import('./owner/OWExpenses'));
const OWProfitLoss   = lazy(() => import('./owner/OWProfitLoss'));
const OWRevenueReports = lazy(() => import('./owner/OWRevenueReports'));
const OWReports     = lazy(() => import('./owner/OWReports'));
const OWStaff       = lazy(() => import('./owner/OWStaff'));
const OWSettings    = lazy(() => import('./owner/OWSettings'));
const OWReceiptSettings = lazy(() => import('./owner/OWReceiptSettings'));
const OWTaxSettings     = lazy(() => import('./owner/OWTaxSettings'));
const OWNotifications   = lazy(() => import('./owner/OWNotifications'));
const CAOverview    = lazy(() => import('./cashier/CAOverview'));
const CAPOS         = lazy(() => import('./cashier/CAPOS'));
const CAProducts    = lazy(() => import('./cashier/CAProducts'));
const CAInvoices    = lazy(() => import('./cashier/CAInvoices'));
const CASalesHistory = lazy(() => import('./cashier/CASalesHistory'));
const CAProfile     = lazy(() => import('./cashier/CAProfile'));

const PageLoader = () => (
  <div className="space-y-4 p-1">
    <Skeleton className="h-8 w-64 bg-muted" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 bg-muted rounded-lg" />)}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 bg-muted rounded-lg" />)}
    </div>
  </div>
);

const VIEWS: Record<string, React.ReactNode> = {
  'sa-overview':    <SAOverview />,
  'sa-businesses':  <SABusinesses />,
  'sa-licenses':    <SALicenses />,
  'sa-plans':       <SASubscriptionPlans />,
  'sa-users-roles': <SAUsersRoles />,
  'sa-analytics':   <SASystemAnalytics />,
  'sa-reports':     <SAReports />,
  'sa-settings':    <SASettings />,
  'ow-overview':    <OWOverview />,
  'ow-pos':         <OWPOS />,
  'ow-sales-history': <OWSalesHistory />,
  'ow-quotations':  <OWQuotations />,
  'ow-invoices':    <OWInvoices />,
  'ow-returns':     <OWReturns />,
  'ow-products':    <OWProducts />,
  'ow-categories':  <OWCategories />,
  'ow-inventory':   <OWInventory />,
  'ow-stock-movements':   <OWStockMovements />,
  'ow-inventory-reports': <OWInventoryReports />,
  'ow-purchase-orders':   <OWPurchaseOrders />,
  'ow-purchases':         <OWPurchases />,
  'ow-suppliers':         <OWSuppliers />,
  'ow-customers':   <OWCustomers />,
  'ow-expenses':    <OWExpenses />,
  'ow-profit-loss': <OWProfitLoss />,
  'ow-revenue-reports': <OWRevenueReports />,
  'ow-reports':     <OWReports />,
  'ow-staff':       <OWStaff />,
  'ow-settings':    <OWSettings />,
  'ow-receipt-settings': <OWReceiptSettings />,
  'ow-tax-settings':     <OWTaxSettings />,
  'ow-notifications':    <OWNotifications />,
  'ow-profile':     <CAProfile />, // no dedicated owner profile page yet — CAProfile is generic enough to reuse (see final report)
  'ca-overview':    <CAOverview />,
  'ca-pos':         <CAPOS />,
  'ca-products':    <CAProducts />,
  'ca-invoices':    <CAInvoices />,
  'ca-history':     <CASalesHistory />,
  'ca-profile':     <CAProfile />,
};

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
    <ShieldOff className="w-10 h-10 text-muted-foreground" />
    <div>
      <p className="text-base font-semibold text-foreground">Access Restricted</p>
      <p className="text-sm text-muted-foreground mt-1">You don't have permission to view this section.</p>
    </div>
  </div>
);

export default function DashboardPage() {
  const { appUser } = useAuth();
  const navItems = useNavItems(appUser?.role);
  const defaultKey = useMemo(() => navItems[0]?.key ?? '', [navItems]);
  const [activeKey, setActiveKey] = useState('');

  // Sync to first nav item once auth resolves and navItems populate
  useEffect(() => {
    if (defaultKey && !activeKey) {
      setActiveKey(defaultKey);
    }
  }, [defaultKey, activeKey]);

  // Role-based view guard: if the key exists but the role isn't allowed, show denied
  const allowed = activeKey ? canAccessView(appUser?.role, activeKey) : true;

  const currentView = !activeKey ? (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      Select a section from the sidebar
    </div>
  ) : !allowed ? (
    <AccessDenied />
  ) : (
    VIEWS[activeKey] ?? (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Section not found
      </div>
    )
  );

  return (
    <DashboardNavContext.Provider value={{ navigate: setActiveKey }}>
      <DashboardLayout activeKey={activeKey} onNavChange={setActiveKey}>
        <Suspense fallback={<PageLoader />}>
          {currentView}
        </Suspense>
      </DashboardLayout>
    </DashboardNavContext.Provider>
  );
}
