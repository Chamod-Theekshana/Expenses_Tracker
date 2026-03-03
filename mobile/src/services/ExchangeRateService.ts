import { apiFetch } from './http';

type RatesResponse = {
  base: string;
  rates: Record<string, number>;
};

let cachedRates: Record<string, number> | null = null;
let cachedBase: string = '';
let cachedAt: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export class ExchangeRateService {
  static async getRates(base: string = 'USD'): Promise<Record<string, number>> {
    const upperBase = base.toUpperCase();

    if (cachedRates && cachedBase === upperBase && Date.now() - cachedAt < CACHE_TTL) {
      return cachedRates;
    }

    try {
      const data = await apiFetch<RatesResponse>(`/api/exchange-rates?base=${upperBase}`);
      cachedRates = data.rates;
      cachedBase = upperBase;
      cachedAt = Date.now();
      return data.rates;
    } catch (err) {
      console.error('[ExchangeRate] Failed to fetch rates:', err);
      if (cachedRates) return cachedRates;
      return {};
    }
  }

  static async convert(amount: number, from: string, to: string): Promise<number> {
    if (from.toUpperCase() === to.toUpperCase()) return amount;
    const rates = await ExchangeRateService.getRates(from);
    const rate = rates[to.toUpperCase()];
    if (!rate) return amount;
    return Math.round(amount * rate * 100) / 100;
  }
}
