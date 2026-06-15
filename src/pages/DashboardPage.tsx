import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useNavItems } from '@/lib/navConfig';
import { canAccessView } from '@/components/common/RouteGuard';
import { ShieldOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy-loaded views for code splitting
const SAOverview    = lazy(() => import('./superadmin/SAOverview'));
const SABusinesses  = lazy(() => import('./superadmin/SABusinesses'));
const SAUsersRoles  = lazy(() => import('./superadmin/SAUsersRoles'));
const SAReports     = lazy(() => import('./superadmin/SAReports'));
const SASettings    = lazy(() => import('./superadmin/SASettings'));
const OWOverview    = lazy(() => import('./owner/OWOverview'));
const OWPOS         = lazy(() => import('./owner/OWPOS'));
const OWProducts    = lazy(() => import('./owner/OWProducts'));
const OWInventory   = lazy(() => import('./owner/OWInventory'));
const OWCustomers   = lazy(() => import('./owner/OWCustomers'));
const OWReports     = lazy(() => import('./owner/OWReports'));
const OWStaff       = lazy(() => import('./owner/OWStaff'));
const OWSettings    = lazy(() => import('./owner/OWSettings'));
const CAOverview    = lazy(() => import('./cashier/CAOverview'));
const CAPOS         = lazy(() => import('./cashier/CAPOS'));
const CAProducts    = lazy(() => import('./cashier/CAProducts'));
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
  'sa-users-roles': <SAUsersRoles />,
  'sa-reports':     <SAReports />,
  'sa-settings':    <SASettings />,
  'ow-overview':    <OWOverview />,
  'ow-pos':         <OWPOS />,
  'ow-products':    <OWProducts />,
  'ow-inventory':   <OWInventory />,
  'ow-customers':   <OWCustomers />,
  'ow-reports':     <OWReports />,
  'ow-staff':       <OWStaff />,
  'ow-settings':    <OWSettings />,
  'ca-overview':    <CAOverview />,
  'ca-pos':         <CAPOS />,
  'ca-products':    <CAProducts />,
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
    <DashboardLayout activeKey={activeKey} onNavChange={setActiveKey}>
      <Suspense fallback={<PageLoader />}>
        {currentView}
      </Suspense>
    </DashboardLayout>
  );
}
