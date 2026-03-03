import { sql } from '../config/db';

export interface Transaction {
  id: number;
  user_id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  created_at: Date;
}

export class TransactionModel {
  static async findByUserId(userId: string): Promise<Transaction[]> {
    const result = await sql`
      SELECT * FROM transactions 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC
    `;
    return result as Transaction[];
  }

  static async create(
    userId: string,
    title: string,
    amount: number,
    category: string,
    createdAt?: string,
    currency?: string
  ): Promise<Transaction> {
    const cur = currency || 'LKR';
    const result = createdAt
      ? await sql`
          INSERT INTO transactions (user_id, title, amount, category, currency, created_at)
          VALUES (${userId}, ${title}, ${amount}, ${category}, ${cur}, ${createdAt})
          RETURNING *
        `
      : await sql`
          INSERT INTO transactions (user_id, title, amount, category, currency)
          VALUES (${userId}, ${title}, ${amount}, ${category}, ${cur})
          RETURNING *
        `;
    return result[0] as Transaction;
  }

  static async deleteByUser(id: string, userId: string): Promise<void> {
    await sql`DELETE FROM transactions WHERE id = ${id} AND user_id = ${userId}`;
  }

  static async findByIdAndUser(id: string, userId: string): Promise<Transaction | null> {
    const rows = await sql`SELECT * FROM transactions WHERE id = ${id} AND user_id = ${userId}`;
    return (rows?.[0] as Transaction) || null;
  }

  static async updateByUser(
    id: string,
    userId: string,
    title: string,
    amount: number,
    category: string,
    createdAt?: string,
    currency?: string
  ): Promise<Transaction | null> {
    const cur = currency || 'LKR';
    const rows = createdAt
      ? await sql`
          UPDATE transactions
          SET title = ${title}, amount = ${amount}, category = ${category}, currency = ${cur}, created_at = ${createdAt}
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING *
        `
      : await sql`
          UPDATE transactions
          SET title = ${title}, amount = ${amount}, category = ${category}, currency = ${cur}
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING *
        `;
    return (rows?.[0] as Transaction) || null;
  }
}
