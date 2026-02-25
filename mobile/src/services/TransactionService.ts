import { API_URL } from '../config/env';
import { Transaction } from '../models/Transaction';

export class TransactionService {
  static async getTransactions(userId: string): Promise<Transaction[]> {
    const response = await fetch(`${API_URL}/api/transaction/${userId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch transactions');
    return data.transactions.map((tx: any) => ({
      id: String(tx.id),
      title: tx.title,
      category: tx.category,
      amount: Number(tx.amount),
      dateISO: tx.created_at,
    }));
  }

  static async createTransaction(
    title: string,
    amount: number,
    category: string,
    userId: string
  ): Promise<void> {
    const response = await fetch(`${API_URL}/api/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, amount, category, user_id: userId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create transaction');
  }

  static async deleteTransaction(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/transaction/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete transaction');
  }
}
