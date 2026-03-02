import { apiFetch } from './http';

export type Budget = {
  id: string;
  category: string;
  amount: number;
  period: string;
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
      period: String(b.period || 'monthly'),
    }));
  }

  static async getStatus(): Promise<BudgetStatus[]> {
    const data = await apiFetch<{ budgets: any[] }>('/api/budgets/status');
    return (data.budgets || []).map((b) => ({
      id: String(b.id),
      category: String(b.category),
      amount: Number(b.amount),
      period: String(b.period || 'monthly'),
      spent: Number(b.spent),
      percentage: Number(b.percentage),
    }));
  }

  static async create(category: string, amount: number): Promise<Budget> {
    const data = await apiFetch<{ budget: any }>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ category, amount }),
    });
    return {
      id: String(data.budget.id),
      category: data.budget.category,
      amount: Number(data.budget.amount),
      period: data.budget.period,
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
      period: data.budget.period,
    };
  }

  static async remove(id: string): Promise<void> {
    await apiFetch(`/api/budgets/${id}`, { method: 'DELETE' });
  }
}
