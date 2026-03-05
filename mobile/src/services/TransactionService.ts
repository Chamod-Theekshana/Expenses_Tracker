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
      receiptUrl: tx.receipt_url || null,
    }));
  }

  static async createTransaction(
    title: string,
    amount: number,
    category: string,
    _userId: string,
    dateISO?: string,
    currency?: string,
    receiptUrl?: string | null,
  ): Promise<void> {
    await apiFetch(`/api/transaction`, {
      method: 'POST',
      body: JSON.stringify({ title, amount, category, dateISO, currency: currency || 'LKR', receipt_url: receiptUrl || null }),
    });
  }

  static async updateTransaction(
    id: string,
    title: string,
    amount: number,
    category: string,
    dateISO?: string,
    currency?: string,
    receiptUrl?: string | null,
  ): Promise<void> {
    await apiFetch(`/api/transaction/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, amount, category, dateISO, currency: currency || 'LKR', receipt_url: receiptUrl }),
    });
  }

  static async deleteTransaction(id: string): Promise<void> {
    await apiFetch(`/api/transaction/${id}`, { method: 'DELETE' });
  }
}
