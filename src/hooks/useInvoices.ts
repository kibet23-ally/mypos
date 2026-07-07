import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchInvoices, fetchCustomers, fetchInvoiceSettings } from '@/services/invoiceService';
import type { Invoice, Customer, InvoiceSettings } from '@/types/invoice';

export function useInvoices() {
  const { appUser } = useAuth();
  const tenantId = appUser?.tenant_id ?? '';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [invData, custData, settingsData] = await Promise.all([
        fetchInvoices(tenantId),
        fetchCustomers(tenantId),
        fetchInvoiceSettings(tenantId),
      ]);
      setInvoices(invData);
      setCustomers(custData);
      setSettings(settingsData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  return { invoices, customers, settings, loading, error, reload: load };
}
