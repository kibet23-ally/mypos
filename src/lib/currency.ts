/**
 * currency.ts
 * Currency formatting utilities for PosifyPro.
 *
 * Default currency: Kenyan Shilling (KES)
 * Supports multi-currency businesses.
 */

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'sw-TZ' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', locale: 'en-UG' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', locale: 'en-GH' },
  { code: 'ZMW', symbol: 'K', name: 'Zambian Kwacha', locale: 'en-ZM' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
];

export const DEFAULT_CURRENCY = SUPPORTED_CURRENCIES[0];

export function getCurrencyByCode(code?: string): CurrencyOption {
  if (!code) return DEFAULT_CURRENCY;

  return (
    SUPPORTED_CURRENCIES.find(
      c => c.code.toUpperCase() === code.toUpperCase()
    ) ?? DEFAULT_CURRENCY
  );
}

/**
 * Standard currency formatter.
 * Example:
 * KSh 1,250.00
 */
export function formatCurrency(
  amount: number | null | undefined,
  code = DEFAULT_CURRENCY.code
): string {
  const value = Number(amount ?? 0);
  const currency = getCurrencyByCode(code);

  return `${currency.symbol} ${new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

/**
 * Compact currency formatter.
 * Examples:
 * KSh 1.2K
 * KSh 2.5M
 * KSh 7.8B
 */
export function formatCurrencyCompact(
  amount: number | null | undefined,
  code = DEFAULT_CURRENCY.code
): string {
  const value = Number(amount ?? 0);
  const currency = getCurrencyByCode(code);

  return `${currency.symbol} ${new Intl.NumberFormat(currency.locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value)}`;
}

/**
 * Format number without currency symbol.
 * Example:
 * 12,450.00
 */
export function formatAmount(
  amount: number | null | undefined,
  code = DEFAULT_CURRENCY.code
): string {
  const value = Number(amount ?? 0);
  const currency = getCurrencyByCode(code);

  return new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Currency symbol only.
 */
export function getCurrencySymbol(code = DEFAULT_CURRENCY.code): string {
  return getCurrencyByCode(code).symbol;
}

/**
 * Currency name only.
 */
export function getCurrencyName(code = DEFAULT_CURRENCY.code): string {
  return getCurrencyByCode(code).name;
}

/**
 * Locale only.
 */
export function getCurrencyLocale(code = DEFAULT_CURRENCY.code): string {
  return getCurrencyByCode(code).locale;
}

/**
 * Validate supported currency.
 */
export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.some(
    c => c.code.toUpperCase() === code.toUpperCase()
  );
}