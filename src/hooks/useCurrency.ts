import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, getCurrencyByCode, DEFAULT_CURRENCY } from '@/lib/currency';

/**
 * Returns currency helpers scoped to the current tenant's currency setting.
 * Falls back to KES if the tenant hasn't set a currency yet.
 */
export function useCurrency() {
  const { appUser } = useAuth();
  const currencyCode: string = appUser?.tenant?.currency_code ?? DEFAULT_CURRENCY.code;
  const currencyInfo = getCurrencyByCode(currencyCode);

  return {
    currencyCode,
    symbol: currencyInfo.symbol,
    /** Format a numeric amount using the tenant's currency */
    format: (amount: number) => formatCurrency(amount, currencyCode),
  };
}
