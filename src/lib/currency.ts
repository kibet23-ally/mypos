export const DEFAULT_CURRENCY = 'KES';

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: 'KES', label: 'KES — Kenyan Shilling', symbol: 'KSh' },
  { value: 'USD', label: 'USD — US Dollar', symbol: '$' },
  { value: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP — British Pound', symbol: '£' },
  { value: 'UGX', label: 'UGX — Ugandan Shilling', symbol: 'USh' },
  { value: 'TZS', label: 'TZS — Tanzanian Shilling', symbol: 'TSh' },
  { value: 'NGN', label: 'NGN — Nigerian Naira', symbol: '₦' },
  { value: 'ZAR', label: 'ZAR — South African Rand', symbol: 'R' },
];

const LOCALE_BY_CURRENCY: Record<string, string> = {
  KES: 'en-KE',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  UGX: 'en-UG',
  TZS: 'en-TZ',
  NGN: 'en-NG',
  ZAR: 'en-ZA',
};

/** Returns the display symbol for a given currency code, e.g. 'KES' -> 'KSh'. */
export const getCurrencySymbol = (currencyCode: string = DEFAULT_CURRENCY): string => {
  const match = CURRENCY_OPTIONS.find(c => c.value === currencyCode);
  return match?.symbol ?? currencyCode;
};

/**
 * Formats a numeric amount using the given currency code.
 * Defaults to the tenant-wide DEFAULT_CURRENCY if no code is passed.
 */
export const formatCurrency = (
  amount: number | string = 0,
  currencyCode: string = DEFAULT_CURRENCY
): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const locale = LOCALE_BY_CURRENCY[currencyCode] ?? 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(num);
  } catch {
    // Unknown ISO code — fall back to symbol + plain number rather than throwing.
    return `${getCurrencySymbol(currencyCode)} ${num.toLocaleString()}`;
  }
};
