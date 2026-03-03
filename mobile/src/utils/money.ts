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
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

export function formatMoney(n: number, currency: string = 'LKR'): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const symbol = getCurrencySymbol(currency);
  return `${sign}${symbol}${abs.toFixed(2)}`;
}
