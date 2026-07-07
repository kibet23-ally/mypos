<<<<<<< HEAD
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavItems } from '@/lib/navConfig';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import OfflineIndicator from '@/components/common/OfflineIndicator';
=======
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavSections } from '@/lib/navConfig';
import { useLiveClock } from '@/hooks/useLiveClock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
<<<<<<< HEAD
  ShoppingCart, Menu, Clock, ChevronDown, LogOut, User,
  ShoppingBasket, UtensilsCrossed, Shirt, Pill, Cpu, Scissors, Store,
} from 'lucide-react';
import type { BusinessType } from '@/types/index';
=======
  Zap, Menu, Clock, ChevronDown, LogOut, User,
  ChevronRight, PanelLeftClose, PanelLeftOpen, Construction,
} from 'lucide-react';
import type { NavSection, NavItem } from '@/types/index';
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)

interface DashboardLayoutProps {
  activeKey: string;
  onNavChange: (key: string) => void;
  children: React.ReactNode;
}

<<<<<<< HEAD
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
=======
const ROLE_BADGE: Record<string, string> = {
  superadmin: 'bg-blue-50 text-blue-700 border border-blue-200',
  owner:      'bg-emerald-50 text-emerald-700 border border-emerald-200',
  manager:    'bg-purple-50 text-purple-700 border border-purple-200',
  cashier:    'bg-amber-50 text-amber-700 border border-amber-200',
};
const ROLE_INDICATOR: Record<string, string> = {
  superadmin: 'bg-blue-500',
  owner:      'bg-emerald-500',
  manager:    'bg-purple-500',
  cashier:    'bg-amber-500',
};
const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  owner:      'Owner',
  manager:    'Manager',
  cashier:    'Cashier',
};

function NavItemRow({
  item, isActive, collapsed, onClick,
}: { item: NavItem; isActive: boolean; collapsed: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <li>
      <button
        type="button"
        title={collapsed ? item.label : undefined}
        onClick={onClick}
        className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 min-h-10 group relative
          ${collapsed ? 'px-2 justify-center' : 'px-3'}
          ${isActive
            ? 'bg-blue-50 text-blue-700 border border-blue-100'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
        {!collapsed && (
          <>
            <span className="truncate flex-1 text-left">{item.label}</span>
            {item.comingSoon && (
              <Construction className="w-3 h-3 text-slate-300 shrink-0" />
            )}
            {item.badge && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0">
                {item.badge}
              </span>
            )}
          </>
        )}
        {/* Tooltip on collapsed */}
        {collapsed && (
          <span className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium bg-slate-900 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {item.label}
          </span>
        )}
      </button>
    </li>
  );
}

function SectionGroup({
  section, activeKey, collapsed, onNavChange, onClose,
}: {
  section: NavSection;
  activeKey: string;
  collapsed: boolean;
  onNavChange: (key: string) => void;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const hasTitle = !!section.title;

  return (
    <div className="mb-1">
      {hasTitle && !collapsed && (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors group"
        >
          <span>{section.title}</span>
          <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      )}
      {hasTitle && collapsed && (
        <div className="h-px bg-slate-100 mx-2 my-2" />
      )}
      {(open || collapsed) && (
        <ul className="space-y-0.5">
          {section.items.map(item => (
            <NavItemRow
              key={item.key}
              item={item}
              isActive={activeKey === item.key}
              collapsed={collapsed}
              onClick={() => { onNavChange(item.key); onClose?.(); }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardLayout({ activeKey, onNavChange, children }: DashboardLayoutProps) {
  const { appUser, signOut } = useAuth();
  const sections = useNavSections(appUser?.role);
  const clock = useLiveClock();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const displayName  = appUser?.display_name || appUser?.email?.split('@')[0] || 'User';
  const businessName = appUser?.tenant?.business_name || (appUser?.role === 'superadmin' ? 'PosifyPro HQ' : 'My Business');
  const role         = appUser?.role || 'cashier';
  const roleLabel    = ROLE_LABEL[role] || role;

  const handleNavChange = useCallback((key: string) => {
    onNavChange(key);
    setMobileOpen(false);
  }, [onNavChange]);

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-white transition-all duration-200 ${!isMobile && collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo + collapse toggle */}
      <div className={`flex items-center border-b border-slate-100 shrink-0 ${collapsed && !isMobile ? 'px-2 py-4 justify-center' : 'px-5 py-4 gap-3'}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-600">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 tracking-tight truncate">PosifyPro</p>
            <p className="text-[11px] text-slate-500 truncate">{businessName}</p>
          </div>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={() => setCollapsed(v => !v)}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Role badge */}
      {(!collapsed || isMobile) && (
        <div className="px-4 pt-3 pb-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${ROLE_BADGE[role]}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ROLE_INDICATOR[role]}`} />
            {roleLabel}
          </span>
        </div>
      )}

      {/* Nav sections */}
      <nav className={`flex-1 py-2 overflow-y-auto overflow-x-hidden ${collapsed && !isMobile ? 'px-1' : 'px-3'}`}>
        {sections.map(section => (
          <SectionGroup
            key={section.key}
            section={section}
            activeKey={activeKey}
            collapsed={collapsed && !isMobile}
            onNavChange={handleNavChange}
            onClose={isMobile ? () => setMobileOpen(false) : undefined}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-slate-100 shrink-0 ${collapsed && !isMobile ? 'px-1 py-3' : 'px-4 py-4'}`}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-600 shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">{appUser?.email}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          title={collapsed && !isMobile ? 'Sign Out' : undefined}
          className={`flex items-center gap-2 text-xs text-slate-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 w-full
            ${collapsed && !isMobile ? 'justify-center px-2 py-2' : 'px-2 py-1.5'}`}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
        </button>
      </div>
    </div>
  );

  return (
<<<<<<< HEAD
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
=======
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent isMobile={false} />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 px-4 md:px-6 h-14">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"
                  className="lg:hidden shrink-0 border border-slate-200 h-8 w-8 text-slate-500 hover:text-slate-900">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-slate-200 bg-white">
                <SidebarContent isMobile={true} />
              </SheetContent>
            </Sheet>

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">{businessName}</h1>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-mono shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
              <Clock className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">{clock}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"
                  className="flex items-center gap-2 px-3 h-8 text-sm font-medium shrink-0 text-slate-700 hover:text-slate-900 border-slate-200 bg-white">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-600 shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block max-w-[100px] truncate text-slate-700">{displayName}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white border border-slate-200 shadow-lg">
                <div className="px-3 py-2 bg-white">
                  <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{appUser?.email}</p>
                  <Badge className={`text-xs mt-1.5 capitalize ${ROLE_BADGE[role]}`}>{roleLabel}</Badge>
                </div>
                <DropdownMenuSeparator className="bg-slate-200" />
                <DropdownMenuItem className="gap-2 cursor-pointer text-slate-700 hover:text-slate-900 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-900">
                  <User className="w-4 h-4 text-slate-500" /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200" />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
<<<<<<< HEAD

          {/* Mobile clock bar */}
          <div className="flex items-center gap-2 px-4 pb-2 md:hidden">
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-mono">{clock}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto fade-in">
          {children}
=======
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto fade-in">
          <SubscriptionGuard>
            {children}
          </SubscriptionGuard>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
        </main>
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
