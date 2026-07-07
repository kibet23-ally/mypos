import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import PWAUpdatePrompt from '@/components/common/PWAUpdatePrompt';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { routes } from './routes';

console.log('[PosifyPro] App component rendering');

const App: React.FC = () => {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <RouteGuard>
            <IntersectObserver />
            <Routes>
              {routes.map((route, index) => (
                <Route
                  key={index}
                  path={route.path}
                  element={route.element}
                />
              ))}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <Toaster richColors closeButton />
            <PWAUpdatePrompt />
          </RouteGuard>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
