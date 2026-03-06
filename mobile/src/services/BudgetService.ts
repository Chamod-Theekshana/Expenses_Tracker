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
};

export class BudgetService {
  static async list(): Promise<Budget[]> {
    const data = await apiFetch<{ budgets: any[] }>('/api/budgets');
    return (data.budgets || []).map((b) => ({
      id: String(b.id),
      category: String(b.category),
      amount: Number(b.amount),
      currency: String(b.currency || 'LKR'),
      period: String(b.period || 'monthly'),
      created_at: String(b.created_at || new Date().toISOString()),
    }));
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
    let qs = parts.length > 0 ? `?${parts.join('&')}` : '';
    const url = `/api/budgets/status${qs}`;
    const data = await apiFetch<{ budgets: any[] }>(url);
    return (data.budgets || []).map((b) => ({
      id: String(b.id),
      category: String(b.category),
      amount: Number(b.amount),
      currency: String(b.currency || 'LKR'),
      period: String(b.period || 'monthly'),
      created_at: String(b.created_at || new Date().toISOString()),
      spent: Number(b.spent),
      percentage: Number(b.percentage),
    }));
  }

  static async create(category: string, amount: number, currency: string = 'LKR'): Promise<Budget> {
    const data = await apiFetch<{ budget: any }>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ category, amount, currency }),
    });
    return {
      id: String(data.budget.id),
      category: data.budget.category,
      amount: Number(data.budget.amount),
      currency: String(data.budget.currency || 'LKR'),
      period: data.budget.period,
      created_at: String(data.budget.created_at || new Date().toISOString()),
    };
  }

  static async update(id: string, amount: number): Promise<Budget> {
    const data = await apiFetch<{ budget: any }>(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    });
    return {
      id: String(data.budget.id),
      category: data.budget.category,
      amount: Number(data.budget.amount),
      currency: String(data.budget.currency || 'LKR'),
      period: data.budget.period,
      created_at: String(data.budget.created_at || new Date().toISOString()),
    };
  }

  static async remove(id: string): Promise<void> {
    await apiFetch(`/api/budgets/${id}`, { method: 'DELETE' });
  }
}
