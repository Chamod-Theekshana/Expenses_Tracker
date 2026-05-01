import { Transaction, TransactionSplit } from '../models/Transaction';
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
      notes: tx.notes ?? null,
      tags: Array.isArray(tx.tags)
        ? tx.tags
            .map((tag: any) => String(tag || '').trim().replace(/^#+/, '').toLowerCase())
            .filter((tag: string) => tag.length > 0)
        : [],
      receiptUrl: tx.receipt_url || null,
      splits: Array.isArray(tx.splits)
        ? tx.splits.map((split: any) => ({
            id: split.id != null ? String(split.id) : undefined,
            category: String(split.category || ''),
            amount: Number(split.amount),
            percentage: Number(split.percentage),
          }))
        : [],
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
    splits?: TransactionSplit[],
    notes?: string | null,
    tags?: string[],
  ): Promise<void> {
    const payload: any = {
      title,
      amount,
      category,
      dateISO,
      currency: currency || 'LKR',
      receipt_url: receiptUrl || null,
    };

    if (notes !== undefined) {
      payload.notes = notes;
    }
    if (tags !== undefined) {
      payload.tags = tags;
    }

    if (splits !== undefined) {
      payload.splits = splits.map((split) => ({
        category: split.category,
        amount: split.amount,
        percentage: split.percentage,
      }));
    }

    await apiFetch(`/api/transaction`, {
      method: 'POST',
      body: JSON.stringify(payload),
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
    splits?: TransactionSplit[],
    notes?: string | null,
    tags?: string[],
  ): Promise<void> {
    const payload: any = {
      title,
      amount,
      category,
      dateISO,
      currency: currency || 'LKR',
      receipt_url: receiptUrl,
    };

    if (notes !== undefined) {
      payload.notes = notes;
    }
    if (tags !== undefined) {
      payload.tags = tags;
    }

    if (splits !== undefined) {
      payload.splits = splits.map((split) => ({
        category: split.category,
        amount: split.amount,
        percentage: split.percentage,
      }));
    }

    await apiFetch(`/api/transaction/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  static async deleteTransaction(id: string): Promise<void> {
    await apiFetch(`/api/transaction/${id}`, { method: 'DELETE' });
  }
}
