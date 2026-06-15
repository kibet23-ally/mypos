/**
 * OfflineIndicator.tsx
 * Shows a subtle online/offline badge in the dashboard header.
 * Also shows a badge when pending sales are waiting to sync.
 */
import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
}

export default function OfflineIndicator({
  isOnline,
  isSyncing,
  pendingCount,
  lastSyncAt,
}: OfflineIndicatorProps) {
  const tooltipText = !isOnline
    ? `You are offline. ${pendingCount > 0 ? `${pendingCount} sale${pendingCount > 1 ? 's' : ''} queued.` : 'Sales will be saved locally.'}`
    : isSyncing
      ? 'Syncing offline sales to server…'
      : pendingCount > 0
        ? `Syncing ${pendingCount} pending sale${pendingCount > 1 ? 's' : ''}…`
        : lastSyncAt
          ? `Online — last sync ${lastSyncAt.toLocaleTimeString()}`
          : 'Online';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default select-none shrink-0">
            {/* Status dot + icon */}
            {!isOnline ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-destructive/10 border border-destructive/30">
                <WifiOff className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="text-xs font-medium text-destructive hidden sm:inline">Offline</span>
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 ml-0.5">
                    {pendingCount}
                  </Badge>
                )}
              </div>
            ) : isSyncing ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30">
                <RefreshCw className="w-3.5 h-3.5 text-[hsl(var(--warning))] shrink-0 animate-spin" />
                <span className="text-xs font-medium text-[hsl(var(--warning))] hidden sm:inline">Syncing</span>
              </div>
            ) : pendingCount > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30">
                <CloudOff className="w-3.5 h-3.5 text-[hsl(var(--warning))] shrink-0" />
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]">
                  {pendingCount}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/30">
                <Wifi className="w-3.5 h-3.5 text-[hsl(var(--success))] shrink-0" />
                <span className="text-xs font-medium text-[hsl(var(--success))] hidden sm:inline">Online</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
