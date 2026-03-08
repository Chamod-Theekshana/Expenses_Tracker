import { sql } from '../config/db';
import { convert, getRate } from '../services/exchangeRateService';

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
  remaining: number;
  /** true when one or more transaction currencies could not be converted — spent/percentage may be understated */
  conversion_error: boolean;
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
   * Optimised: single SQL aggregation instead of N×M sequential convert() calls.
   * Currency conversion is done in a single batch per unique currency pair.
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
      startDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      endDate = startDate;
    } else if (year && month) {
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (year) {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else {
      // Default: current month
      const now = new Date();
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // Fetch budgets and pre-aggregate spending by category+currency in ONE query
    const [budgets, spendingRows] = await Promise.all([
      sql`
        SELECT id, user_id, category, amount, currency, period, created_at
        FROM budgets
        WHERE user_id = ${userId}
        ORDER BY category ASC
      `,
      sql`
        SELECT category, currency, ABS(SUM(amount)) AS total
        FROM transactions
        WHERE user_id = ${userId}
          AND amount < 0
          AND created_at >= ${startDate}::date
          AND created_at <= ${endDate}::date
        GROUP BY category, currency
      `,
    ]);

    // Build a lookup: category -> list of { amount, currency }
    const spendingMap = new Map<string, Array<{ amount: number; currency: string }>>();
    for (const row of spendingRows as any[]) {
      const cat = String(row.category);
      if (!spendingMap.has(cat)) spendingMap.set(cat, []);
      spendingMap.get(cat)!.push({ amount: Number(row.total), currency: String(row.currency || 'LKR') });
    }

    // Pre-fetch unique currency pairs needed (avoid redundant convert() calls)
    // null = conversion failed (rate unavailable) — surfaces as NaN in spent so UI can warn
    const conversionCache = new Map<string, number | null>();
    const uniquePairs = new Set<string>();
    for (const budget of budgets as any[]) {
      const budgetCurrency = String(budget.currency || 'LKR');
      const rows = spendingMap.get(budget.category) || [];
      for (const row of rows) {
        if (row.currency !== budgetCurrency) {
          uniquePairs.add(`${row.currency}→${budgetCurrency}`);
        }
      }
    }

    // Fetch all needed rates in parallel
    await Promise.all(
      Array.from(uniquePairs).map(async (pair) => {
        const [from, to] = pair.split('→');
        try {
          const rate = await getRate(from, to);
          conversionCache.set(pair, rate);
        } catch {
          // Store null — NOT 1. Rate=1 would silently show wrong data (e.g. $50 displayed as LKR 50).
          // null lets the caller decide how to surface the conversion failure.
          conversionCache.set(pair, null);
          console.warn(`[BudgetModel] Rate unavailable for ${from}→${to}. Budget spent will be marked as unconvertible.`);
        }
      })
    );

    // Now calculate statuses without any additional async calls
    return (budgets as any[]).map((b) => {
      const budgetCurrency = String(b.currency || 'LKR');
      const amountVal = Number(b.amount);
      const spending = spendingMap.get(b.category) || [];

      let spentTotal = 0;
      let hasConversionError = false;

      for (const s of spending) {
        if (s.currency === budgetCurrency) {
          spentTotal += s.amount;
        } else {
          const rate = conversionCache.get(`${s.currency}→${budgetCurrency}`);
          if (rate === null || rate === undefined) {
            // Rate unavailable — flag it so client can show a warning
            hasConversionError = true;
          } else {
            spentTotal += s.amount * rate;
          }
        }
      }

      const spent = Math.round(spentTotal * 100) / 100;
      const percentage = amountVal > 0 ? Math.round((spent / amountVal) * 100) : 0;
      const remaining = Math.max(0, Math.round((amountVal - spent) * 100) / 100);

      return {
        id: b.id,
        user_id: b.user_id,
        category: b.category,
        amount: amountVal,
        currency: budgetCurrency,
        period: b.period,
        created_at: b.created_at,
        spent,
        percentage,
        remaining,
        conversion_error: hasConversionError,
      };
    });
  }

  static async findByCategory(userId: string, category: string): Promise<BudgetRow | null> {
    const rows = await sql`
      SELECT id, user_id, category, amount, currency, period, created_at
      FROM budgets
      WHERE user_id = ${userId} AND category = ${category}
    `;
    return (rows[0] as BudgetRow) || null;
  }

  static async getCategorySpent(userId: string, category: string, currency: string = 'LKR'): Promise<number> {
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const rows = await sql`
      SELECT ABS(SUM(amount)) AS total, currency
      FROM transactions
      WHERE user_id = ${userId}
        AND category = ${category}
        AND amount < 0
        AND created_at >= ${firstOfMonth}::date
      GROUP BY currency
    `;

    let spent = 0;
    for (const row of rows as any[]) {
      const absAmount = Number(row.total);
      const txCurrency = String(row.currency || 'LKR');
      try {
        spent += await convert(absAmount, txCurrency, currency);
      } catch {
        spent += absAmount;
      }
    }
    return Math.round(spent * 100) / 100;
  }
}
