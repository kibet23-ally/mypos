import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavItems } from '@/lib/navConfig';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import OfflineIndicator from '@/components/common/OfflineIndicator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShoppingCart, Menu, Clock, ChevronDown, LogOut, User,
  ShoppingBasket, UtensilsCrossed, Shirt, Pill, Cpu, Scissors, Store,
} from 'lucide-react';
import type { BusinessType } from '@/types/index';

interface DashboardLayoutProps {
  activeKey: string;
  onNavChange: (key: string) => void;
  children: React.ReactNode;
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-[hsl(var(--info))] text-white',
  owner: 'bg-[hsl(var(--success))] text-white',
  cashier: 'bg-[hsl(var(--warning))] text-white',
};

const BUSINESS_TYPE_META: Record<BusinessType, { label: string; Icon: React.ElementType }> = {
  supermarket:  { label: 'Supermarket',  Icon: ShoppingBasket },
  restaurant:   { label: 'Restaurant',   Icon: UtensilsCrossed },
  clothing:     { label: 'Clothing',     Icon: Shirt },
  pharmacy:     { label: 'Pharmacy',     Icon: Pill },
  electronics:  { label: 'Electronics', Icon: Cpu },
  salon:        { label: 'Salon',        Icon: Scissors },
  general:      { label: 'General',      Icon: Store },
};

export default function DashboardLayout({ activeKey, onNavChange, children }: DashboardLayoutProps) {
  const { appUser, signOut } = useAuth();
  const navItems = useNavItems(appUser?.role);
  const clock = useLiveClock();
  const [mobileOpen, setMobileOpen] = useState(false);

  const businessName = appUser?.tenant?.business_name || (appUser?.role === 'superadmin' ? 'PosifyPro HQ' : 'My Business');
  const username = appUser?.username || 'User';
  const role = appUser?.role || 'cashier';
  const bizType = appUser?.business_type ?? null;
  const bizMeta = bizType ? BUSINESS_TYPE_META[bizType] : null;

  const { isOnline, isSyncing, pendingCount, lastSyncAt } = useOfflineSync(appUser?.tenant_id ?? null);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Sidebar header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center shrink-0">
          <ShoppingCart className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-sidebar-accent-foreground truncate">PosifyPro</p>
          <p className="text-xs text-sidebar-foreground truncate">{businessName}</p>
        </div>
      </div>

      {/* Role + business type */}
      <div className="px-5 pt-4 pb-2 shrink-0 space-y-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${ROLE_COLORS[role]}`}>
          {role}
        </span>
        {bizMeta && (
          <div className="flex items-center gap-1.5">
            <bizMeta.Icon className="w-3.5 h-3.5 text-sidebar-foreground shrink-0" />
            <span className="text-xs text-sidebar-foreground">{bizMeta.label}</span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => {
                    onNavChange(item.key);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors duration-150 min-h-12 ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-xs bg-sidebar-primary text-sidebar-primary-foreground px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar footer */}
      <div className="px-5 py-4 border-t border-sidebar-border shrink-0">
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2.5 text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Main content column */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3 px-4 md:px-6 h-16">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0 text-muted-foreground hover:text-foreground border border-border h-9 w-9"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            {/* Business Name + type */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-base font-bold text-foreground truncate">{businessName}</h1>
                {bizMeta && (
                  <Badge variant="secondary" className="text-xs hidden md:inline-flex shrink-0 gap-1 items-center">
                    <bizMeta.Icon className="w-3 h-3" />
                    {bizMeta.label}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground hidden md:block truncate">
                Welcome, <span className="font-medium text-foreground">{username}</span>
              </p>
            </div>

            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono shrink-0 bg-muted px-3 py-1.5 rounded border border-border">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{clock}</span>
            </div>

            {/* Offline / online indicator */}
            <OfflineIndicator
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingCount={pendingCount}
              lastSyncAt={lastSyncAt}
            />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-3 h-9 border border-border text-sm font-medium shrink-0"
                >
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-xs text-primary-foreground font-bold uppercase">
                      {username.charAt(0)}
                    </span>
                  </div>
                  <span className="hidden sm:block max-w-[120px] truncate">{username}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground truncate">{username}</p>
                  <Badge variant="secondary" className="text-xs mt-1">{role}</Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile clock bar */}
          <div className="flex items-center gap-2 px-4 pb-2 md:hidden">
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-mono">{clock}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
