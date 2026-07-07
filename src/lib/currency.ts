/**
 * currency.ts
 * Currency formatting utilities for PosifyPro.
 *
 * Default: KES (Kenyan Shilling, symbol KSh)
 * Owners can override per-business in Settings.
 */

// ─── Supported currencies ────────────────────────────────────────────────────
export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  locale: string; // Intl locale for number formatting
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling',   locale: 'en-KE' },
  { code: 'USD', symbol: '$',   name: 'US Dollar',          locale: 'en-US' },
  { code: 'EUR', symbol: '€',   name: 'Euro',               locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',      locale: 'en-GB' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'sw-TZ' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling',   locale: 'en-UG' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand', locale: 'en-ZA' },
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira',     locale: 'en-NG' },
  { code: 'GHS', symbol: '₵',   name: 'Ghanaian Cedi',      locale: 'en-GH' },
  { code: 'ZMW', symbol: 'K',   name: 'Zambian Kwacha',     locale: 'en-ZM' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',       locale: 'en-IN' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',         locale: 'ar-AE' },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan',       locale: 'zh-CN' },
];

export const DEFAULT_CURRENCY: CurrencyOption = SUPPORTED_CURRENCIES[0]; // KES

// ─── Lookup helpers ───────────────────────────────────────────────────────────
export function getCurrencyByCode(code: string): CurrencyOption {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) ?? DEFAULT_CURRENCY;
}

// ─── Core formatter ───────────────────────────────────────────────────────────
/**
 * Format a monetary value.
 * @param amount  numeric value
 * @param code    ISO 4217 currency code (default 'KES')
 * @param opts    optional Intl.NumberFormat options overrides
 *
 * Examples:
 *   formatCurrency(1500)           → "KSh 1,500.00"
 *   formatCurrency(1500, 'USD')    → "$ 1,500.00"
 *   formatCurrency(1500, 'KES', { symbol: true }) → "KSh 1,500.00"
 */
export function formatCurrency(
  amount: number,
  code = DEFAULT_CURRENCY.code,
  opts: { compact?: boolean } = {},
): string {
  const curr = getCurrencyByCode(code);

  if (opts.compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `${curr.symbol} ${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `${curr.symbol} ${(amount / 1_000).toFixed(1)}k`;
    }
  }

  const formatted = new Intl.NumberFormat(curr.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${curr.symbol} ${formatted}`;
}

/**
 * Compact formatter for charts/dashboards: e.g. "KSh 3.8k"
 */
export function formatCurrencyCompact(amount: number, code = DEFAULT_CURRENCY.code): string {
  return formatCurrency(amount, code, { compact: true });
}

/**
 * Format number as plain string with thousand separators (no symbol).
 */
export function formatAmount(amount: number, code = DEFAULT_CURRENCY.code): string {
  const curr = getCurrencyByCode(code);
  return new Intl.NumberFormat(curr.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
