import { apiFetch } from './http';

export type RecurringRule = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  frequency: string;
  next_run: string;
  is_active: boolean;
};

export class RecurringService {
  static async list(): Promise<RecurringRule[]> {
    const data = await apiFetch<{ recurring: any[] }>('/api/recurring');
    return (data.recurring || []).map((r) => ({
      id: String(r.id),
      title: String(r.title),
      amount: Number(r.amount),
      currency: String(r.currency || 'LKR'),
      category: String(r.category),
      frequency: String(r.frequency),
      next_run: String(r.next_run),
      is_active: Boolean(r.is_active),
    }));
  }

  static async create(
    title: string,
    amount: number,
    category: string,
    frequency: string,
    startDate?: string
  ): Promise<RecurringRule> {
    const data = await apiFetch<{ recurring: any }>('/api/recurring', {
      method: 'POST',
      body: JSON.stringify({ title, amount, category, frequency, startDate }),
    });
    return {
      id: String(data.recurring.id),
      title: data.recurring.title,
      amount: Number(data.recurring.amount),
      currency: String(data.recurring.currency || 'LKR'),
      category: data.recurring.category,
      frequency: data.recurring.frequency,
      next_run: data.recurring.next_run,
      is_active: Boolean(data.recurring.is_active),
    };
  }

  static async update(
    id: string,
    fields: { title?: string; amount?: number; category?: string; frequency?: string; is_active?: boolean }
  ): Promise<RecurringRule> {
    const data = await apiFetch<{ recurring: any }>(`/api/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
    return {
      id: String(data.recurring.id),
      title: data.recurring.title,
      amount: Number(data.recurring.amount),
      currency: String(data.recurring.currency || 'LKR'),
      category: data.recurring.category,
      frequency: data.recurring.frequency,
      next_run: data.recurring.next_run,
      is_active: Boolean(data.recurring.is_active),
    };
  }

  static async remove(id: string): Promise<void> {
    await apiFetch(`/api/recurring/${id}`, { method: 'DELETE' });
  }
}
