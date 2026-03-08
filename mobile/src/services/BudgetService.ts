import { apiFetch } from './http';

export type Budget = {
  id: string;
  category: string;
  amount: number;
  currency: string;
  period: string;
  created_at: string;
};

export type BudgetStatus = Budget & {
  spent: number;
  percentage: number;
  remaining: number;
  /** true = some multi-currency transactions couldn't be converted; spent may be understated */
  conversion_error: boolean;
};

function mapBudget(b: any): Budget {
  return {
    id: String(b.id),
    category: String(b.category),
    amount: Number(b.amount),
    currency: String(b.currency || 'LKR'),
    period: String(b.period || 'monthly'),
    created_at: String(b.created_at || new Date().toISOString()),
  };
}

function mapBudgetStatus(b: any): BudgetStatus {
  return {
    ...mapBudget(b),
    spent: Number(b.spent ?? 0),
    percentage: Number(b.percentage ?? 0),
    remaining: Number(b.remaining ?? Math.max(0, Number(b.amount) - Number(b.spent ?? 0))),
    conversion_error: Boolean(b.conversion_error ?? false),
  };
}

export class BudgetService {
  static async list(): Promise<Budget[]> {
    const data = await apiFetch<{ budgets: any[] }>('/api/budgets');
    return (data.budgets || []).map(mapBudget);
  }

  static async getStatus(
    year?: number | null,
    month?: number | null,
    day?: number | null,
  ): Promise<BudgetStatus[]> {
    const parts: string[] = [];
    if (year) parts.push(`year=${year}`);
    if (month) parts.push(`month=${month}`);
    if (day) parts.push(`day=${day}`);
    const qs = parts.length > 0 ? `?${parts.join('&')}` : '';
    const data = await apiFetch<{ budgets: any[] }>(`/api/budgets/status${qs}`);
    return (data.budgets || []).map(mapBudgetStatus);
  }

  static async create(category: string, amount: number, currency: string = 'LKR'): Promise<Budget> {
    const data = await apiFetch<{ budget: any }>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ category, amount, currency }),
    });
    return mapBudget(data.budget);
  }

  static async update(id: string, amount: number): Promise<Budget> {
    const data = await apiFetch<{ budget: any }>(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    });
    return mapBudget(data.budget);
  }

  static async remove(id: string): Promise<void> {
    await apiFetch(`/api/budgets/${id}`, { method: 'DELETE' });
  }
}
