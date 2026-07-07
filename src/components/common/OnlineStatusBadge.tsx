import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Small status pill showing live connectivity. Drop this into DashboardLayout's
 * header next to the clock, or anywhere a cashier/owner needs to see at a glance
 * whether they're working offline.
 */
export default function OnlineStatusBadge() {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={`hidden md:flex items-center gap-1.5 text-xs font-medium shrink-0 px-3 py-1.5 rounded-lg border ${
        isOnline
          ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
          : 'text-amber-700 border-amber-200 bg-amber-50'
      }`}
      title={isOnline ? 'Connected' : 'Offline — sales will sync when connection returns'}
    >
      {isOnline ? <Wifi className="w-3 h-3 shrink-0" /> : <WifiOff className="w-3 h-3 shrink-0" />}
      <span className="whitespace-nowrap">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}
