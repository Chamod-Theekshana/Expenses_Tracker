import { sql } from '../config/db';

export type CategoryRow = {
  id: number;
  user_id: string;
  name: string;
  type: 'expense' | 'income' | 'both';
  created_at: string;
};

export class CategoryModel {
  static async listByUser(userId: string) {
    const rows = await sql`
      SELECT id, user_id, name, type, created_at
      FROM categories
      WHERE user_id = ${userId}
      ORDER BY name ASC
    `;
    return rows;
  }

  static async create(userId: string, name: string, type: 'expense' | 'income' | 'both' = 'expense') {
    const rows = await sql`
      INSERT INTO categories (user_id, name, type)
      VALUES (${userId}, ${name}, ${type})
      RETURNING id, user_id, name, type, created_at
    `;
    return rows[0];
  }

  static async update(userId: string, id: number, name: string, type: 'expense' | 'income' | 'both') {
    const rows = await sql`
      UPDATE categories
      SET name = ${name}, type = ${type}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, user_id, name, type, created_at
    `;
    return rows[0] || null;
  }

  static async delete(userId: string, id: number) {
    const rows = await sql`
      DELETE FROM categories
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;
    return rows.length > 0;
  }

  static async seedDefaults(userId: string) {
    // Only seed if user has none.
    const existing = await sql`SELECT COUNT(*)::int AS c FROM categories WHERE user_id = ${userId}`;
    if ((existing[0]?.c ?? 0) > 0) return;

    const defaults: Array<{ name: string; type: 'expense' | 'income' | 'both' }> = [
      { name: 'Food', type: 'expense' },
      { name: 'Transport', type: 'expense' },
      { name: 'Bills', type: 'expense' },
      { name: 'Shopping', type: 'expense' },
      { name: 'Other', type: 'expense' },
      { name: 'Income', type: 'income' },
    ];

    for (const d of defaults) {
      await sql`INSERT INTO categories (user_id, name, type) VALUES (${userId}, ${d.name}, ${d.type})`;
    }
  }
}
