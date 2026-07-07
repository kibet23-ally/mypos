import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes';
<<<<<<< HEAD
import type { UserRole } from '@/types/index';
=======
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)

interface RouteGuardProps {
  children: React.ReactNode;
}

<<<<<<< HEAD
const SYSTEM_PUBLIC_ROUTES = ['/login', '/register', '/activate', '/onboarding', '/403', '/404'];
const routePublicPaths = routes.filter(r => r.public).map(r => r.path);
const PUBLIC_ROUTES = [...SYSTEM_PUBLIC_ROUTES, ...routePublicPaths];

// View keys permitted per role
const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  superadmin: ['sa-', 'ow-', 'ca-'],
  owner:      ['ow-', 'ca-'],
  cashier:    ['ca-'],
};

=======
const SYSTEM_PUBLIC_ROUTES = ['/login', '/register', '/activate', '/403', '/404'];
const routePublicPaths = routes.filter(r => r.public).map(r => r.path);
const PUBLIC_ROUTES = [...SYSTEM_PUBLIC_ROUTES, ...routePublicPaths];

>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, appUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

<<<<<<< HEAD
    // Not logged in → login
=======
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    if (user && appUser) {
      const role = appUser.role;
      const tenant = appUser.tenant;

<<<<<<< HEAD
      // Already authenticated — bounce away from login/register
=======
      // Redirect away from login/register if already authenticated
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/dashboard', { replace: true });
        return;
      }

<<<<<<< HEAD
      // Superadmin: skip all tenant checks
      if (role === 'superadmin') {
        if (['/activate', '/onboarding'].includes(location.pathname)) {
          navigate('/dashboard', { replace: true });
        }
        return;
      }

      // Owner / Cashier: must have activated tenant
      if (!tenant?.is_activated && location.pathname !== '/activate') {
        navigate('/activate', { replace: true });
        return;
      }
      if (tenant?.is_activated && location.pathname === '/activate') {
        // After activation, owners must complete onboarding first
        if (role === 'owner' && !appUser.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
        return;
      }

      // Owner: activated but onboarding not done → force onboarding
      if (role === 'owner' && tenant?.is_activated && !appUser.onboarding_completed) {
        if (location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
          return;
        }
      }

      // Onboarding already done → skip onboarding page
      if (location.pathname === '/onboarding' && appUser.onboarding_completed) {
        navigate('/dashboard', { replace: true });
        return;
=======
      // Superadmin skips license check
      if (role !== 'superadmin') {
        // If tenant not activated, redirect to activation (except if already there)
        if (!tenant?.is_activated && location.pathname !== '/activate') {
          navigate('/activate', { replace: true });
          return;
        }
        // If activated, don't stay on activate page
        if (tenant?.is_activated && location.pathname === '/activate') {
          navigate('/dashboard', { replace: true });
          return;
        }
      } else {
        if (location.pathname === '/activate') {
          navigate('/dashboard', { replace: true });
          return;
        }
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
      }
    }
  }, [user, appUser, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-sidebar-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading PosifyPro...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
<<<<<<< HEAD

// ─── Helper used by DashboardPage to guard individual view keys ───────────────
export function canAccessView(role: UserRole | undefined, viewKey: string): boolean {
  if (!role) return false;
  const allowed = ROLE_ALLOWED_PREFIXES[role] ?? [];
  return allowed.some(prefix => viewKey.startsWith(prefix));
}
=======
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
