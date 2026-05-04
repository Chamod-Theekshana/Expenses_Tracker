import { Transaction, TransactionSplit } from '../models/Transaction';
import { enqueueCreateTxBody } from './offlineOutbox';
import { apiFetch } from './http';

const DEFAULT_PAGE_SIZE = 200;

export type TransactionsPageMeta = {
  limit: number;
  offset: number;
  total: number;
};

function mapApiTransaction(tx: any): Transaction {
  return {
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
  };
}

export class TransactionService {
  /**
   * Paginated list; backend defaults apply when options omitted.
   */
  static async getTransactions(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ transactions: Transaction[]; page: TransactionsPageMeta }> {
    const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
    const offset = options?.offset ?? 0;
    const qs = `?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`;
    const data = await apiFetch<{ transactions: any[]; page: TransactionsPageMeta }>(
      `/api/transaction/${userId}${qs}`,
    );
    const transactions = (data.transactions || []).map(mapApiTransaction);
    return { transactions, page: data.page };
  }

  static async getTransactionById(id: string): Promise<Transaction | null> {
    const data = await apiFetch<{ transaction?: any }>(`/api/transaction/id/${id}`);
    const tx = data?.transaction;
    if (!tx) return null;
    return mapApiTransaction(tx);
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

    const body = JSON.stringify(payload);
    try {
      await apiFetch(`/api/transaction`, {
        method: 'POST',
        body,
      });
    } catch (e: any) {
      if (!e?.status) {
        try {
          await enqueueCreateTxBody(body);
        } catch {
          /* ignore storage errors */
        }
      }
      throw e;
    }
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

  static async bulkDeleteTransactions(ids: number[]): Promise<void> {
    await apiFetch(`/api/transaction/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }
}
