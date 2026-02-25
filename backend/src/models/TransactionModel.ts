import { sql } from '../config/db';

export interface Transaction {
  id: number;
  user_id: string;
  title: string;
  amount: number;
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
    category: string
  ): Promise<Transaction> {
    const result = await sql`
      INSERT INTO transactions (user_id, title, amount, category) 
      VALUES (${userId}, ${title}, ${amount}, ${category}) 
      RETURNING *
    `;
    return result[0] as Transaction;
  }

  static async delete(id: string): Promise<void> {
    await sql`DELETE FROM transactions WHERE id = ${id}`;
  }
}
