import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currency';

/**
 * Returns currency helpers scoped to the current tenant's currency setting.
 * Falls back to KES if the tenant hasn't set a currency yet.
 */
export function useCurrency() {
  const { appUser } = useAuth();
  const currencyCode: string = appUser?.tenant?.currency ?? DEFAULT_CURRENCY;

  return {
    currencyCode,
    symbol: getCurrencySymbol(currencyCode),
    /** Format a numeric amount using the tenant's currency */
    format: (amount: number | string) => formatCurrency(amount, currencyCode),
  };
}
