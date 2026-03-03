import { sql } from '../config/db';

export type BudgetRow = {
  id: number;
  user_id: string;
  category: string;
  amount: number;
  period: string;
  created_at: string;
};

export type BudgetStatus = BudgetRow & {
  spent: number;
  percentage: number;
};

export class BudgetModel {
  static async listByUser(userId: string): Promise<BudgetRow[]> {
    const rows = await sql`
      SELECT id, user_id, category, amount, period, created_at
      FROM budgets
      WHERE user_id = ${userId}
      ORDER BY category ASC
    `;
    return rows as BudgetRow[];
  }

  static async findById(userId: string, id: number): Promise<BudgetRow | null> {
    const rows = await sql`
      SELECT id, user_id, category, amount, period, created_at
      FROM budgets
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return (rows[0] as BudgetRow) || null;
  }

  static async create(
    userId: string,
    category: string,
    amount: number,
    period: string = 'monthly'
  ): Promise<BudgetRow> {
    const rows = await sql`
      INSERT INTO budgets (user_id, category, amount, period)
      VALUES (${userId}, ${category}, ${amount}, ${period})
      RETURNING id, user_id, category, amount, period, created_at
    `;
    return rows[0] as BudgetRow;
  }

  static async update(userId: string, id: number, amount: number): Promise<BudgetRow | null> {
    const rows = await sql`
      UPDATE budgets
      SET amount = ${amount}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, user_id, category, amount, period, created_at
    `;
    return (rows[0] as BudgetRow) || null;
  }

  static async delete(userId: string, id: number): Promise<boolean> {
    const rows = await sql`
      DELETE FROM budgets
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;
    return rows.length > 0;
  }

  /**
   * Returns all budgets for a user with spending calculated for the given date range.
   * If no year/month/day provided, defaults to current month spending.
   */
  static async getStatusByUser(
    userId: string,
    year?: number,
    month?: number,
    day?: number,
  ): Promise<BudgetStatus[]> {
    let startDate: string;
    let endDate: string;

    if (year && month && day) {
      // Specific date
      startDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      endDate = startDate; // same day
    } else if (year && month) {
      // Specific month
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (year) {
      // Entire year
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else {
      // Default: current month
      const now = new Date();
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    const rows = await sql`
      SELECT
        b.id,
        b.user_id,
        b.category,
        b.amount,
        b.period,
        b.created_at,
        COALESCE(ABS(SUM(
          CASE WHEN t.amount < 0
               AND t.created_at >= ${startDate}::date
               AND t.created_at <= ${endDate}::date + interval '1 day'
               THEN t.amount ELSE 0 END
        )), 0) AS spent
      FROM budgets b
      LEFT JOIN transactions t
        ON t.user_id = b.user_id AND t.category = b.category
      WHERE b.user_id = ${userId}
      GROUP BY b.id, b.user_id, b.category, b.amount, b.period, b.created_at
      ORDER BY b.category ASC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      category: r.category,
      amount: Number(r.amount),
      period: r.period,
      created_at: r.created_at,
      spent: Number(r.spent),
      percentage: Number(r.amount) > 0 ? Math.round((Number(r.spent) / Number(r.amount)) * 100) : 0,
    }));
  }

  /**
   * Get budget for a specific category (used for alert checking).
   */
  static async findByCategory(userId: string, category: string): Promise<BudgetRow | null> {
    const rows = await sql`
      SELECT id, user_id, category, amount, period, created_at
      FROM budgets
      WHERE user_id = ${userId} AND category = ${category}
    `;
    return (rows[0] as BudgetRow) || null;
  }

  /**
   * Get current month spending for a specific category.
   */
  static async getCategorySpent(userId: string, category: string): Promise<number> {
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const rows = await sql`
      SELECT COALESCE(ABS(SUM(amount)), 0) AS spent
      FROM transactions
      WHERE user_id = ${userId}
        AND category = ${category}
        AND amount < 0
        AND created_at >= ${firstOfMonth}::date
    `;
    return Number(rows[0]?.spent ?? 0);
  }
}
