import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; isChunkError: boolean; isEnvError: boolean; }

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as Error).message ?? '').toLowerCase();
  const name = String((err as Error).name ?? '').toLowerCase();
  return (
    msg.includes('loading chunk') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    name.includes('chunkloaderror')
  );
}

function isEnvError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as Error).message ?? '');
  return msg.includes('VITE_SUPABASE') || msg.includes('environment variable');
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false, isEnvError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isChunkError: isChunkLoadError(error),
      isEnvError: isEnvError(error),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[PosifyPro] ErrorBoundary caught:', error.message, info.componentStack);
  }

  handleReload = () => {
    if ('serviceWorker' in navigator && 'caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  render() {
    const { hasError, error, isChunkError, isEnvError } = this.state;
    if (!hasError) return this.props.children;

    const title = isEnvError
      ? 'Configuration Error'
      : isChunkError
      ? 'New version available'
      : 'Something went wrong';

    const message = isEnvError
      ? 'Supabase environment variables are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings under Settings → Environment Variables, then redeploy.'
      : isChunkError
      ? 'A new version of PosifyPro has been deployed. Please reload to get the latest version.'
      : 'An unexpected error occurred. Reload the page to continue.';

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isEnvError ? 'bg-red-50' : 'bg-amber-50'}`}>
              <AlertTriangle className={`w-7 h-7 ${isEnvError ? 'text-red-500' : 'text-amber-500'}`} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
            {!isChunkError && !isEnvError && error && (
              <p className="text-xs text-slate-400 font-mono bg-slate-50 rounded-lg px-3 py-2 break-all text-left">
                {error.message}
              </p>
            )}
          </div>
          {!isEnvError && (
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {isChunkError ? 'Reload to update' : 'Reload page'}
            </button>
          )}
          {isEnvError && (
            <p className="text-xs text-slate-400">
              This is a deployment configuration issue — contact your administrator.
            </p>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
