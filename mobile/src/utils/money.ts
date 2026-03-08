const CURRENCY_SYMBOLS: Record<string, string> = {
  LKR: '₨',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  SGD: 'S$',
  AED: 'د.إ',
  SAR: '﷼',
  MYR: 'RM',
  THB: '฿',
  PHP: '₱',
  IDR: 'Rp',
  KRW: '₩',
  NZD: 'NZ$',
  BRL: 'R$',
  MXN: 'MX$',
  ZAR: 'R',
  HKD: 'HK$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
};

export function getCurrencySymbol(currency: string): string {
  if (!currency) return '';
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency.toUpperCase();
}

/**
 * Format a monetary amount with currency symbol.
 * Negative amounts show with a minus sign.
 */
export function formatMoney(n: number, currency: string = 'LKR'): string {
  if (!Number.isFinite(n)) return `${getCurrencySymbol(currency)}0.00`;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const symbol = getCurrencySymbol(currency);
  // Use compact notation for large numbers for readability
  if (abs >= 1_000_000) {
    return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 10_000) {
    return `${sign}${symbol}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sign}${symbol}${abs.toFixed(2)}`;
}

/**
 * Parse a string amount to a number safely.
 * Returns null if the input is invalid.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || cleaned === '') return null;
  return n;
}
