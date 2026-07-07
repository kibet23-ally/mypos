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
    const hasTenant      = !!appUser.tenant_id;
    const isActivated    = !!appUser.tenant?.is_activated;
    const onboardingDone = !!appUser.onboarding_completed;

    // ── Superadmin: bypass all tenant / onboarding checks ────────────────────
    if (role === 'superadmin') {
      if (path === '/' || path === '/login' || path === '/register' ||
          path === '/activate' || path === '/onboarding') {
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    // ── Step 1 — No tenant, or tenant not yet activated ───────────────────────
    // Public browsing pages stay accessible; everything else forces /activate.
    if (!hasTenant || !isActivated) {
      if (path === '/' || path === '/login' || path === '/register' || path === '/activate') {
        return;
      }
      navigate('/activate', { replace: true });
      return;
    }

    // ── Step 2 — Activated tenant but onboarding not yet complete ─────────────
    // Allow public pages + /onboarding itself; block every other private route.
    if (!onboardingDone) {
      if (path === '/' || path === '/login' || path === '/register' || path === '/onboarding') {
        return;
      }
      navigate('/onboarding', { replace: true });
      return;
    }

    // ── Step 3 — Fully onboarded: redirect away from auth / setup pages ───────
    if (path === '/' || path === '/login' || path === '/register' ||
        path === '/activate' || path === '/onboarding') {
      navigate('/dashboard', { replace: true });
      return;
    }

    // All other private routes: authenticated + fully onboarded → allow.
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