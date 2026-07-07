import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes';

interface RouteGuardProps {
  children: React.ReactNode;
}

const SYSTEM_PUBLIC_ROUTES = ['/login', '/register', '/activate', '/403', '/404'];
const routePublicPaths = routes.filter(r => r.public).map(r => r.path);
const PUBLIC_ROUTES = [...SYSTEM_PUBLIC_ROUTES, ...routePublicPaths];

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

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    if (user && appUser) {
      const role = appUser.role;
      const tenant = appUser.tenant;

      // Redirect away from login/register if already authenticated
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/dashboard', { replace: true });
        return;
      }

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
