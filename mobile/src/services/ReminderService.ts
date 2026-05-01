import { apiFetch } from './http';

export type ReminderItem = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  due_date: string;
  remind_days_before: number;
  is_active: boolean;
  last_notified_on?: string | null;
};

export class ReminderService {
  static async list(): Promise<ReminderItem[]> {
    const data = await apiFetch<{ reminders: any[] }>('/api/reminders');

    return (data.reminders || []).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      amount: Number(row.amount),
      currency: String(row.currency || 'LKR'),
      category: String(row.category || 'Bills'),
      due_date: String(row.due_date),
      remind_days_before: Number(row.remind_days_before || 1),
      is_active: Boolean(row.is_active),
      last_notified_on: row.last_notified_on ? String(row.last_notified_on) : null,
    }));
  }

  static async create(input: {
    title: string;
    amount: number;
    category: string;
    due_date: string;
    remind_days_before: number;
    currency?: string;
    is_active?: boolean;
  }): Promise<ReminderItem> {
    const data = await apiFetch<{ reminder: any }>('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    const row = data.reminder;
    return {
      id: String(row.id),
      title: String(row.title),
      amount: Number(row.amount),
      currency: String(row.currency || 'LKR'),
      category: String(row.category || 'Bills'),
      due_date: String(row.due_date),
      remind_days_before: Number(row.remind_days_before || 1),
      is_active: Boolean(row.is_active),
      last_notified_on: row.last_notified_on ? String(row.last_notified_on) : null,
    };
  }

  static async update(
    id: string,
    fields: Partial<{
      title: string;
      amount: number;
      category: string;
      due_date: string;
      remind_days_before: number;
      currency: string;
      is_active: boolean;
    }>,
  ): Promise<ReminderItem> {
    const data = await apiFetch<{ reminder: any }>(`/api/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    });

    const row = data.reminder;
    return {
      id: String(row.id),
      title: String(row.title),
      amount: Number(row.amount),
      currency: String(row.currency || 'LKR'),
      category: String(row.category || 'Bills'),
      due_date: String(row.due_date),
      remind_days_before: Number(row.remind_days_before || 1),
      is_active: Boolean(row.is_active),
      last_notified_on: row.last_notified_on ? String(row.last_notified_on) : null,
    };
  }

  static async remove(id: string): Promise<void> {
    await apiFetch(`/api/reminders/${id}`, { method: 'DELETE' });
  }
}
