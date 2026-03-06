import { sql } from '../config/db';
import { convert } from '../services/exchangeRateService';

export type BudgetRow = {
  id: number;
  user_id: string;
  category: string;
  amount: number;
  currency: string;
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
      SELECT id, user_id, category, amount, currency, period, created_at
      FROM budgets
      WHERE user_id = ${userId}
      ORDER BY category ASC
    `;
    return rows as BudgetRow[];
  }

  static async findById(userId: string, id: number): Promise<BudgetRow | null> {
    const rows = await sql`
      SELECT id, user_id, category, amount, currency, period, created_at
      FROM budgets
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return (rows[0] as BudgetRow) || null;
  }

  static async create(
    userId: string,
    category: string,
    amount: number,
    currency: string = 'LKR',
    period: string = 'monthly'
  ): Promise<BudgetRow> {
    const rows = await sql`
      INSERT INTO budgets (user_id, category, amount, currency, period)
      VALUES (${userId}, ${category}, ${amount}, ${currency}, ${period})
      RETURNING id, user_id, category, amount, currency, period, created_at
    `;
    return rows[0] as BudgetRow;
  }

  static async update(userId: string, id: number, amount: number): Promise<BudgetRow | null> {
    const rows = await sql`
      UPDATE budgets
      SET amount = ${amount}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, user_id, category, amount, currency, period, created_at
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

    const budgets = await sql`
      SELECT
        id,
        user_id,
        category,
        amount,
        currency,
        period,
        created_at
      FROM budgets
      WHERE user_id = ${userId}
      ORDER BY category ASC
    `;

    // Fetch transactions in this date range that are expenses (< 0)
    const transactions = await sql`
      SELECT category, amount, currency
      FROM transactions
      WHERE user_id = ${userId}
        AND amount < 0
        AND created_at >= ${startDate}::date
        AND created_at <= ${endDate}::date + interval '1 day'
    `;

    const budgetStatuses = await Promise.all(
      budgets.map(async (b: any) => {
        let spentAccumulator = 0;
        const budgetCategory = b.category;
        const budgetCurrency = b.currency || 'LKR';

        // Find matching transactions for this category
        const matchingTxs = transactions.filter((t: any) => t.category === budgetCategory);
        
        for (const tx of matchingTxs) {
          // Transactions amount is negative, take absolute value
          const absAmount = Math.abs(Number(tx.amount));
          const txCurrency = tx.currency || 'LKR';
          
          // Convert the transaction amount to the budget's currency
          const convertedAmount = await convert(absAmount, txCurrency, budgetCurrency);
          spentAccumulator += convertedAmount;
        }

        const amountVal = Number(b.amount);
        const spentVal = spentAccumulator;

        return {
          id: b.id,
          user_id: b.user_id,
          category: b.category,
          amount: amountVal,
          currency: budgetCurrency,
          period: b.period,
          created_at: b.created_at,
          spent: spentVal,
          percentage: amountVal > 0 ? Math.round((spentVal / amountVal) * 100) : 0,
        };
      })
    );

    return budgetStatuses;
  }

  /**
   * Get budget for a specific category (used for alert checking).
   */
  static async findByCategory(userId: string, category: string): Promise<BudgetRow | null> {
    const rows = await sql`
      SELECT id, user_id, category, amount, currency, period, created_at
      FROM budgets
      WHERE user_id = ${userId} AND category = ${category}
    `;
    return (rows[0] as BudgetRow) || null;
  }

  /**
   * Get current month spending for a specific category.
   */
  static async getCategorySpent(userId: string, category: string, currency: string = 'LKR'): Promise<number> {
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const rows = await sql`
      SELECT amount, currency
      FROM transactions
      WHERE user_id = ${userId}
        AND category = ${category}
        AND amount < 0
        AND created_at >= ${firstOfMonth}::date
    `;
    
    let spent = 0;
    for (const tx of rows) {
      const absAmount = Math.abs(Number(tx.amount));
      const txCurrency = tx.currency || 'LKR';
      spent += await convert(absAmount, txCurrency, currency);
    }

    return spent;
  }
}
