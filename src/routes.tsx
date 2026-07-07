import type { ReactNode } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ActivatePage from './pages/ActivatePage';
import DashboardPage from './pages/DashboardPage';
import DebugPage from './pages/DebugPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Home',
    path: '/',
    element: <LandingPage />,
    public: true,
  },
  {
    name: 'Login',
    path: '/login',
    element: <LoginPage />,
    public: true,
  },
  {
    name: 'Register',
    path: '/register',
    element: <LoginPage />,
    public: true,
  },
  {
    name: 'Activate License',
    path: '/activate',
    element: <ActivatePage />,
    public: false,
  },
  {
    name: 'Dashboard',
    path: '/dashboard',
    element: <DashboardPage />,
    public: false,
  },
  {
    name: 'Debug',
    path: '/debug',
    element: <DebugPage />,
    public: true,
  },
];
