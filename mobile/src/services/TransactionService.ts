import { Transaction } from '../models/Transaction';
import { apiFetch } from './http';

export class TransactionService {
  static async getTransactions(userId: string): Promise<Transaction[]> {
    const data = await apiFetch<{ transactions: any[] }>(`/api/transaction/${userId}`);
    return data.transactions.map((tx: any) => ({
      id: String(tx.id),
      title: tx.title,
      category: tx.category,
      amount: Number(tx.amount),
      currency: tx.currency || 'LKR',
      dateISO: tx.created_at,
    }));
  }

  static async createTransaction(
    title: string,
    amount: number,
    category: string,
    _userId: string,
    dateISO?: string,
    currency?: string,
  ): Promise<void> {
    await apiFetch(`/api/transaction`, {
      method: 'POST',
      body: JSON.stringify({ title, amount, category, dateISO, currency: currency || 'LKR' }),
    });
  }

  static async updateTransaction(
    id: string,
    title: string,
    amount: number,
    category: string,
    dateISO?: string,
    currency?: string,
  ): Promise<void> {
    await apiFetch(`/api/transaction/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, amount, category, dateISO, currency: currency || 'LKR' }),
    });
  }

  static async deleteTransaction(id: string): Promise<void> {
    await apiFetch(`/api/transaction/${id}`, { method: 'DELETE' });
  }
}
