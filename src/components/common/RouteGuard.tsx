import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes';
import type { UserRole } from '@/types/index';

interface RouteGuardProps {
  children: React.ReactNode;
}

const SYSTEM_PUBLIC_ROUTES = ['/login', '/register', '/activate', '/onboarding', '/403', '/404'];
const routePublicPaths = routes.filter(r => r.public).map(r => r.path);
const PUBLIC_ROUTES = [...SYSTEM_PUBLIC_ROUTES, ...routePublicPaths];

// View keys permitted per role
const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  superadmin: ['sa-', 'ow-', 'ca-'],
  owner:      ['ow-', 'ca-'],
  cashier:    ['ca-'],
};

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

    const path = location.pathname;
    const isPublic = matchPublicRoute(path, PUBLIC_ROUTES);

    // ── Not authenticated ─────────────────────────────────────────────────────
    if (!user) {
      // Public routes (including '/') are always accessible without login.
      if (!isPublic) {
        navigate('/login', { state: { from: path }, replace: true });
      }
      return;
    }

    // ── Auth user not yet hydrated (transient — buildAppUser still resolving) ─
    if (!appUser) return;

    const role = appUser.role;
    const tenant = appUser.tenant;
    const hasTenant = !!appUser.tenant_id;
    const isActivated = !!tenant?.is_activated;
    const onboardingDone = !!appUser.onboarding_completed;

    // ── Superadmin: skip all tenant / onboarding checks ───────────────────────
    if (role === 'superadmin') {
      if (path === '/' || path === '/login' || path === '/register' ||
          path === '/activate' || path === '/onboarding') {
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    // ── Owner / Cashier: no tenant yet → must register/activate business ──────
    if (!hasTenant) {
      if (path !== '/activate') navigate('/activate', { replace: true });
      return;
    }

    // ── Has tenant but not activated → must complete activation ───────────────
    if (!isActivated) {
      if (path !== '/activate') navigate('/activate', { replace: true });
      return;
    }

    // ── Activated owner with incomplete onboarding ────────────────────────────
    // Map to /activate (the existing setup flow) — /onboarding route does not exist.
    if (role === 'owner' && !onboardingDone) {
      if (path !== '/activate') navigate('/activate', { replace: true });
      return;
    }

    // ── Fully onboarded: redirect away from auth / setup / landing pages ──────
    if (path === '/' || path === '/login' || path === '/register' ||
        path === '/activate' || path === '/onboarding') {
      navigate('/dashboard', { replace: true });
      return;
    }

    // All other private routes: authenticated + onboarded → allow.
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

// ─── Helper used by DashboardPage to guard individual view keys ───────────────
export function canAccessView(role: UserRole | undefined, viewKey: string): boolean {
  if (!role) return false;
  const allowed = ROLE_ALLOWED_PREFIXES[role] ?? [];
  return allowed.some(prefix => viewKey.startsWith(prefix));
}