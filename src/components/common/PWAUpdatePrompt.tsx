import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

/**
 * With registerType='autoUpdate', the SW activates immediately (skipWaiting +
 * clientsClaim). This banner fires after the page has been auto-reloaded with
 * the new version, letting the cashier know what happened.
 */
export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service worker registered:', swUrl);
      if (registration) {
        // Poll for SW updates every 60 s so long-lived POS sessions catch deploys.
        setInterval(() => {
          if (!(!registration.installing && navigator.onLine)) return;
          registration.update().catch(() => {});
        }, 60_000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed:', error);
    },
    onOfflineReady() {
      console.log('[PWA] App shell fully cached — ready for offline use');
    },
  });

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-slate-200 bg-white max-w-sm">
      <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
      <p className="text-sm text-slate-700 flex-1">
        {needRefresh ? 'New version available — reload to update.' : 'App ready for offline use.'}
      </p>
      {needRefresh && (
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg shrink-0"
          style={{ background: '#2563EB' }}
        >
          Reload
        </button>
      )}
      <button
        onClick={() => { setNeedRefresh(false); setOfflineReady(false); }}
        className="text-slate-400 hover:text-slate-600 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
