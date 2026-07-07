import { useState, useEffect } from 'react';

/**
 * Tracks browser online/offline status via the navigator API and window events.
 * This reflects network reachability as reported by the browser — it does NOT
 * verify Supabase itself is reachable (a captive portal or VPN could report
 * "online" while Supabase is unreachable). Stage 3 sync logic should still
 * handle individual request failures gracefully regardless of this flag.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => {
      console.log('[PWA] Connection restored');
      setIsOnline(true);
    };
    const goOffline = () => {
      console.log('[PWA] Connection lost — entering offline mode');
      setIsOnline(false);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
