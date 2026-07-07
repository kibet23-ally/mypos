import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark">
      <div className="text-center px-4">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: '#2563EB' }}>
            <Zap className="w-7 h-7 text-slate-900" />
          </div>
        </div>
        <p className="text-7xl font-bold gradient-text mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Page not found</h1>
        <p className="text-slate-500 mb-8">This page doesn't exist or has been moved.</p>
        <Link to="/" className="inline-flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold text-slate-900"
          style={{ background: '#2563EB' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
