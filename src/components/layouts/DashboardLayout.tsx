import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavGroups } from '@/lib/navConfig';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import OfflineIndicator from '@/components/common/OfflineIndicator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShoppingCart, Menu, Clock, ChevronDown, ChevronRight, LogOut, User,
  ShoppingBasket, UtensilsCrossed, Shirt, Pill, Cpu, Scissors, Store,
  PanelLeftClose, PanelLeftOpen, Search, Bell, Sun, Moon, Zap, X,
  ShieldCheck, ShieldAlert,
} from 'lucide-react';
import type { BusinessType, NavItem } from '@/types/index';

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

const COLLAPSE_KEY = 'posify.sidebar.collapsed';
const THEME_KEY    = 'posify.theme';

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(v => !v) };
}

function useUnreadNotifications(tenantId: string | null | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    const load = async () => {
      const { count: c } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('read', false);
      if (!cancelled) setCount(c ?? 0);
    };

    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; window.removeEventListener('focus', onFocus); clearInterval(interval); };
  }, [tenantId]);

  return count;
}

export default function DashboardLayout({ activeKey, onNavChange, children }: DashboardLayoutProps) {
  const { appUser, signOut } = useAuth();
  const groups = useNavGroups(appUser?.role);
  const clock = useLiveClock();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const businessName = appUser?.tenant?.business_name || (appUser?.role === 'superadmin' ? 'PosifyPro HQ' : 'My Business');
  const username = appUser?.username || 'User';
  const role = appUser?.role || 'cashier';
  const bizType = appUser?.business_type ?? null;
  const bizMeta = bizType ? BUSINESS_TYPE_META[bizType] : null;
  const isActivated = appUser?.tenant?.is_activated ?? true; // superadmin has no tenant → treat as activated

  const { isOnline, isSyncing, pendingCount, lastSyncAt } = useOfflineSync(appUser?.tenant_id ?? null);
  const unreadCount = useUnreadNotifications(appUser?.role !== 'superadmin' ? appUser?.tenant_id : null);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.trim().toLowerCase();
    return groups
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [groups, search]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(v => {
      localStorage.setItem(COLLAPSE_KEY, !v ? '1' : '0');
      return !v;
    });
  }, []);

  const toggleGroup = (heading: string) =>
    setOpenGroups(prev => ({ ...prev, [heading]: !(prev[heading] ?? true) }));

  const handleNav = (key: string) => {
    onNavChange(key);
    setMobileOpen(false);
  };

  const NavButton = ({ item, showLabel }: { item: NavItem; showLabel: boolean }) => {
    const Icon = item.icon;
    const isActive = activeKey === item.key;
    const button = (
      <button
        type="button"
        onClick={() => handleNav(item.key)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150 min-h-11 ${
          !showLabel ? 'justify-center px-2' : ''
        } ${
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {showLabel && <span className="truncate">{item.label}</span>}
        {showLabel && item.badge && (
          <span className="ml-auto text-xs bg-sidebar-primary text-sidebar-primary-foreground px-1.5 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </button>
    );
    if (showLabel) return <li>{button}</li>;
    return (
      <li>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </li>
    );
  };

  const SidebarContent = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    const showLabels = forceExpanded || !collapsed;
    return (
      <div className="flex flex-col h-full bg-sidebar">
        {/* Sidebar header */}
        <div className={`flex items-center gap-3 px-5 py-5 border-b border-sidebar-border shrink-0 ${!showLabels ? 'px-3 justify-center' : ''}`}>
          <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {showLabels && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-sidebar-accent-foreground truncate">PosifyPro</p>
              <p className="text-xs text-sidebar-foreground truncate">{businessName}</p>
            </div>
          )}
        </div>

        {/* Role + business type + license status */}
        {showLabels && (
          <div className="px-5 pt-4 pb-2 shrink-0 space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${ROLE_COLORS[role]}`}>
                {role}
              </span>
              {appUser?.tenant && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  isActivated ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]' : 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]'
                }`}>
                  {isActivated ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  {isActivated ? 'Active' : 'Trial'}
                </span>
              )}
            </div>
            {bizMeta && (
              <div className="flex items-center gap-1.5">
                <bizMeta.Icon className="w-3.5 h-3.5 text-sidebar-foreground shrink-0" />
                <span className="text-xs text-sidebar-foreground">{bizMeta.label}</span>
              </div>
            )}
          </div>
        )}

        {/* Search navigation */}
        {showLabels && (
          <div className="px-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground/50" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search navigation…"
                className="h-8 pl-8 pr-7 text-xs bg-sidebar-accent/40 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-sidebar-foreground/50" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick action */}
        {showLabels && role !== 'superadmin' && (
          <div className="px-3 pb-2 shrink-0">
            <Button
              size="sm"
              onClick={() => handleNav(role === 'owner' ? 'ow-pos' : 'ca-pos')}
              className="w-full h-8 text-xs gap-1.5 bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90"
            >
              <Zap className="w-3.5 h-3.5" /> New Sale
            </Button>
          </div>
        )}

        {/* Grouped nav items */}
        <nav className="flex-1 px-3 py-1 overflow-y-auto">
          {filteredGroups.map((group, gi) => {
            const isOpen = openGroups[group.heading ?? ''] ?? true;
            return (
              <div key={group.heading ?? `top-${gi}`} className="mb-1">
                {group.heading && showLabels ? (
                  <button
                    onClick={() => toggleGroup(group.heading!)}
                    className="w-full flex items-center justify-between px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
                  >
                    {group.heading}
                    <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                ) : group.heading && !showLabels ? (
                  <div className="h-px bg-sidebar-border my-2 mx-1" />
                ) : null}
                {(isOpen || !showLabels || !!search) && (
                  <ul className="space-y-0.5">
                    {group.items.map(item => <NavButton key={item.key} item={item} showLabel={showLabels} />)}
                  </ul>
                )}
              </div>
            );
          })}
          {search && filteredGroups.length === 0 && (
            <p className="px-2 py-4 text-xs text-sidebar-foreground/50 text-center">No matching pages</p>
          )}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block px-3 py-2 border-t border-sidebar-border shrink-0">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`w-full flex items-center gap-2.5 text-xs text-sidebar-foreground/60 hover:text-sidebar-accent-foreground transition-colors ${!showLabels ? 'justify-center' : 'px-1'}`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4 shrink-0" /> : <PanelLeftClose className="w-4 h-4 shrink-0" />}
            {showLabels && <span>Collapse sidebar</span>}
          </button>
        </div>

        {/* Sidebar footer */}
        <div className={`px-5 py-4 border-t border-sidebar-border shrink-0 ${!showLabels ? 'px-3' : ''}`}>
          <button
            type="button"
            onClick={signOut}
            className={`flex items-center gap-2.5 text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors w-full ${!showLabels ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {showLabels && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar — persistent collapsed state */}
      <aside className={`hidden lg:flex flex-col shrink-0 border-r border-sidebar-border transition-all duration-200 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
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
              <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
                <SidebarContent forceExpanded />
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

            {/* Theme toggle */}
            <Button
              variant="ghost" size="icon"
              onClick={toggleTheme}
              className="shrink-0 text-muted-foreground hover:text-foreground border border-border h-9 w-9"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Notifications */}
            {role !== 'superadmin' && (
              <button
                type="button"
                onClick={() => handleNav(role === 'owner' ? 'ow-notifications' : 'ca-overview')}
                className="relative shrink-0 text-muted-foreground hover:text-foreground border border-border h-9 w-9 rounded-md flex items-center justify-center transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

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
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => handleNav(role === 'owner' ? 'ow-profile' : role === 'cashier' ? 'ca-profile' : 'sa-settings')}
                >
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
