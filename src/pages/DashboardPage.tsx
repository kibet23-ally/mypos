import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useNavSections, flattenNavItems } from '@/lib/navConfig';

// ── Super Admin ───────────────────────────────────────────────────────────────
const SAOverview              = lazy(() => import('./superadmin/SAOverview'));
const SABusinesses            = lazy(() => import('./superadmin/SABusinesses'));
const SALicenses              = lazy(() => import('./superadmin/SALicenses'));
const SASubscriptionPlans     = lazy(() => import('./superadmin/SASubscriptionPlans'));
const SAPayments              = lazy(() => import('./superadmin/SAPayments'));
const SATrialMgmt             = lazy(() => import('./superadmin/SATrialMgmt'));
const SASystemUsers           = lazy(() => import('./superadmin/SASystemUsers'));
const SAUsersRoles            = lazy(() => import('./superadmin/SAUsersRoles'));
const SAActiveBusinesses      = lazy(() => import('./superadmin/SAActiveBusinesses'));
const SASuspendedBusinesses   = lazy(() => import('./superadmin/SASuspendedBusinesses'));
const SALoginActivity         = lazy(() => import('./superadmin/SALoginActivity'));
const SARevenue               = lazy(() => import('./superadmin/SARevenue'));
const SASubscriptionReports   = lazy(() => import('./superadmin/SASubscriptionReports'));
const SAUsageAnalytics        = lazy(() => import('./superadmin/SAUsageAnalytics'));
const SASystemAnalytics       = lazy(() => import('./superadmin/SASystemAnalytics'));
const SANotifications         = lazy(() => import('./superadmin/SANotifications'));
const SAAnnouncements         = lazy(() => import('./superadmin/SAAnnouncements'));
const SAIntegrations          = lazy(() => import('./superadmin/SAIntegrations'));
const SATaxConfig             = lazy(() => import('./superadmin/SATaxConfig'));
const SAReceiptTemplates      = lazy(() => import('./superadmin/SAReceiptTemplates'));
const SAEmailSettings         = lazy(() => import('./superadmin/SAEmailSettings'));
const SASMSSettings           = lazy(() => import('./superadmin/SASMSSettings'));
const SAWhatsAppSettings      = lazy(() => import('./superadmin/SAWhatsAppSettings'));
const SAPaymentGateways       = lazy(() => import('./superadmin/SAPaymentGateways'));
const SAMpesaConfig           = lazy(() => import('./superadmin/SAMpesaConfig'));
const SAAuditLogs             = lazy(() => import('./superadmin/SAAuditLogs'));
const SAActivityLogs          = lazy(() => import('./superadmin/SAActivityLogs'));
const SABackupRestore         = lazy(() => import('./superadmin/SABackupRestore'));
const SASettings              = lazy(() => import('./superadmin/SASettings'));
const SAReports               = lazy(() => import('./superadmin/SAReports'));

// ── Owner ─────────────────────────────────────────────────────────────────────
const OWOverview              = lazy(() => import('./owner/OWOverview'));
const OWPOS                   = lazy(() => import('./owner/OWPOS'));
const OWSalesHistory          = lazy(() => import('./owner/OWSalesHistory'));
const OWQuotations            = lazy(() => import('./owner/OWQuotations'));
const OWInvoices              = lazy(() => import('./owner/OWInvoices'));
const OWReturns               = lazy(() => import('./owner/OWReturns'));
const OWProducts              = lazy(() => import('./owner/OWProducts'));
const OWCategories            = lazy(() => import('./owner/OWCategories'));
const OWInventory             = lazy(() => import('./owner/OWInventory'));
const OWStockMovements        = lazy(() => import('./owner/OWStockMovements'));
const OWInventoryReports      = lazy(() => import('./owner/OWInventoryReports'));
const OWCustomers             = lazy(() => import('./owner/OWCustomers'));
const OWSuppliers             = lazy(() => import('./owner/OWSuppliers'));
const OWPurchases             = lazy(() => import('./owner/OWPurchases'));
const OWPurchaseOrders        = lazy(() => import('./owner/OWPurchaseOrders'));
const OWExpenses              = lazy(() => import('./owner/OWExpenses'));
const OWProfitLoss            = lazy(() => import('./owner/OWProfitLoss'));
const OWRevenueReports        = lazy(() => import('./owner/OWRevenueReports'));
const OWStaff                 = lazy(() => import('./owner/OWStaff'));
const OWUsers                 = lazy(() => import('./owner/OWUsers'));
const OWNotifications         = lazy(() => import('./owner/OWNotifications'));
const OWSettings              = lazy(() => import('./owner/OWSettings'));
const OWReceiptSettings       = lazy(() => import('./owner/OWReceiptSettings'));
const OWTaxSettings           = lazy(() => import('./owner/OWTaxSettings'));
const OWIntegrationsSettings  = lazy(() => import('./owner/OWIntegrationsSettings'));
const OWLicenseSubscription   = lazy(() => import('./owner/OWLicenseSubscription'));
// legacy aliases still used
const OWSales                 = lazy(() => import('./owner/OWSales'));
const OWReports               = lazy(() => import('./owner/OWReports'));

// ── Manager ───────────────────────────────────────────────────────────────────
const MGOverview              = lazy(() => import('./manager/MGOverview'));
const MGPOS                   = lazy(() => import('./manager/MGPOS'));
const MGSalesHistory          = lazy(() => import('./manager/MGSalesHistory'));
const MGQuotations            = lazy(() => import('./manager/MGQuotations'));
const MGInvoices              = lazy(() => import('./manager/MGInvoices'));
const MGReturns               = lazy(() => import('./manager/MGReturns'));
const MGProducts              = lazy(() => import('./manager/MGProducts'));
const MGCategories            = lazy(() => import('./manager/MGCategories'));
const MGInventory             = lazy(() => import('./manager/MGInventory'));
const MGStockMovements        = lazy(() => import('./manager/MGStockMovements'));
const MGInventoryReports      = lazy(() => import('./manager/MGInventoryReports'));
const MGCustomers             = lazy(() => import('./manager/MGCustomers'));
const MGSuppliers             = lazy(() => import('./manager/MGSuppliers'));
const MGPurchases             = lazy(() => import('./manager/MGPurchases'));
const MGExpenses              = lazy(() => import('./manager/MGExpenses'));
const MGPurchaseOrders        = lazy(() => import('./manager/MGPurchaseOrders'));
const MGProfitLoss            = lazy(() => import('./manager/MGProfitLoss'));
const MGRevenueReports        = lazy(() => import('./manager/MGRevenueReports'));
const MGNotifications         = lazy(() => import('./manager/MGNotifications'));

// ── Cashier ───────────────────────────────────────────────────────────────────
const CAOverview              = lazy(() => import('./cashier/CAOverview'));
const CAPOS                   = lazy(() => import('./cashier/CAPOS'));
const CASalesHistory          = lazy(() => import('./cashier/CASalesHistory'));
const CACustomers             = lazy(() => import('./cashier/CACustomers'));
const CAInvoices              = lazy(() => import('./cashier/CAInvoices'));
const CARecordPayments        = lazy(() => import('./cashier/CARecordPayments'));
const CANotifications         = lazy(() => import('./cashier/CANotifications'));
const CAProfile               = lazy(() => import('./cashier/CAProfile'));
// legacy
const CAProducts              = lazy(() => import('./cashier/CAProducts'));

function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const VIEW_MAP: Record<string, React.ReactNode> = {
  // Super Admin
  'sa-overview':              <SAOverview />,
  'sa-businesses':            <SABusinesses />,
  'sa-licenses':              <SALicenses />,
  'sa-subscription-plans':    <SASubscriptionPlans />,
  'sa-payments':              <SAPayments />,
  'sa-trial-mgmt':            <SATrialMgmt />,
  'sa-system-users':          <SASystemUsers />,
  'sa-users-roles':           <SAUsersRoles />,
  'sa-active-businesses':     <SAActiveBusinesses />,
  'sa-suspended-businesses':  <SASuspendedBusinesses />,
  'sa-login-activity':        <SALoginActivity />,
  'sa-revenue':               <SARevenue />,
  'sa-subscription-reports':  <SASubscriptionReports />,
  'sa-usage-analytics':       <SAUsageAnalytics />,
  'sa-system-analytics':      <SASystemAnalytics />,
  'sa-notifications':         <SANotifications />,
  'sa-announcements':         <SAAnnouncements />,
  'sa-integrations':          <SAIntegrations />,
  'sa-tax-config':            <SATaxConfig />,
  'sa-receipt-templates':     <SAReceiptTemplates />,
  'sa-email-settings':        <SAEmailSettings />,
  'sa-sms-settings':          <SASMSSettings />,
  'sa-whatsapp-settings':     <SAWhatsAppSettings />,
  'sa-payment-gateways':      <SAPaymentGateways />,
  'sa-mpesa-config':          <SAMpesaConfig />,
  'sa-audit-logs':            <SAAuditLogs />,
  'sa-activity-logs':         <SAActivityLogs />,
  'sa-backup-restore':        <SABackupRestore />,
  'sa-settings':              <SASettings />,
  'sa-reports':               <SAReports />,
  // Owner
  'ow-overview':              <OWOverview />,
  'ow-pos':                   <OWPOS />,
  'ow-sales-history':         <OWSalesHistory />,
  'ow-sales':                 <OWSales />,
  'ow-quotations':            <OWQuotations />,
  'ow-invoices':              <OWInvoices />,
  'ow-returns':               <OWReturns />,
  'ow-products':              <OWProducts />,
  'ow-categories':            <OWCategories />,
  'ow-inventory':             <OWInventory />,
  'ow-stock-movements':       <OWStockMovements />,
  'ow-inventory-reports':     <OWInventoryReports />,
  'ow-customers':             <OWCustomers />,
  'ow-suppliers':             <OWSuppliers />,
  'ow-purchases':             <OWPurchases />,
  'ow-purchase-orders':       <OWPurchaseOrders />,
  'ow-expenses':              <OWExpenses />,
  'ow-profit-loss':           <OWProfitLoss />,
  'ow-revenue-reports':       <OWRevenueReports />,
  'ow-reports':               <OWReports />,
  'ow-staff':                 <OWStaff />,
  'ow-users':                 <OWUsers />,
  'ow-notifications':         <OWNotifications />,
  'ow-settings':              <OWSettings />,
  'ow-receipt-settings':      <OWReceiptSettings />,
  'ow-tax-settings':          <OWTaxSettings />,
  'ow-integrations-settings': <OWIntegrationsSettings />,
  'ow-license-subscription':  <OWLicenseSubscription />,
  // Manager
  'mg-overview':              <MGOverview />,
  'mg-pos':                   <MGPOS />,
  'mg-sales-history':         <MGSalesHistory />,
  'mg-quotations':            <MGQuotations />,
  'mg-invoices':              <MGInvoices />,
  'mg-returns':               <MGReturns />,
  'mg-products':              <MGProducts />,
  'mg-categories':            <MGCategories />,
  'mg-inventory':             <MGInventory />,
  'mg-stock-movements':       <MGStockMovements />,
  'mg-inventory-reports':     <MGInventoryReports />,
  'mg-customers':             <MGCustomers />,
  'mg-suppliers':             <MGSuppliers />,
  'mg-purchases':             <MGPurchases />,
  'mg-purchase-orders':       <MGPurchaseOrders />,
  'mg-expenses':              <MGExpenses />,
  'mg-profit-loss':           <MGProfitLoss />,
  'mg-revenue-reports':       <MGRevenueReports />,
  'mg-notifications':         <MGNotifications />,
  // Cashier
  'ca-overview':              <CAOverview />,
  'ca-pos':                   <CAPOS />,
  'ca-history':               <CASalesHistory />,
  'ca-products':              <CAProducts />,
  'ca-customers':             <CACustomers />,
  'ca-invoices':              <CAInvoices />,
  'ca-record-payments':       <CARecordPayments />,
  'ca-notifications':         <CANotifications />,
  'ca-profile':               <CAProfile />,
};

export default function DashboardPage() {
  const { appUser } = useAuth();
  const sections    = useNavSections(appUser?.role);
  const allItems    = useMemo(() => flattenNavItems(sections), [sections]);
  const defaultKey  = useMemo(() => allItems[0]?.key ?? '', [allItems]);
  const [activeKey, setActiveKey] = useState('');

  useEffect(() => {
    if (defaultKey && !activeKey) setActiveKey(defaultKey);
  }, [defaultKey, activeKey]);

  const currentView = VIEW_MAP[activeKey] ?? (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      Select a section from the sidebar
    </div>
  );

  return (
    <DashboardLayout activeKey={activeKey} onNavChange={setActiveKey}>
      <Suspense fallback={<ViewLoader />}>
        {currentView}
      </Suspense>
    </DashboardLayout>
  );
}

