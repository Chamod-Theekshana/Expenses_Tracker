import { TransactionModel } from '../models/TransactionModel';
import { BudgetModel } from '../models/BudgetModel';
import { sql } from '../config/db';
import { emitToUser } from '../socket';
import { sendPushToUser } from '../services/pushService';
import { convert } from '../services/exchangeRateService';
import type { AuthedRequest } from '../middleware/requireAuth';

/**
 * Check if a transaction's category has a budget and send alerts at 80%/100% thresholds.
 */
async function checkBudgetAlert(userId: string, category: string) {
  try {
    const budget = await BudgetModel.findByCategory(userId, category);
    if (!budget) return;

    const spent = await BudgetModel.getCategorySpent(userId, category);
    const percentage = budget.amount > 0 ? Math.round((spent / Number(budget.amount)) * 100) : 0;

    if (percentage >= 100) {
      emitToUser(userId, 'budget:alert', {
        category,
        percentage,
        spent,
        limit: Number(budget.amount),
        level: 'exceeded',
      });
      await sendPushToUser(
        userId,
        `🚨 Budget Exceeded: ${category}`,
        `You've spent ₨.${spent.toFixed(2)} of your ₨.${Number(budget.amount).toFixed(2)} ${category} budget (${percentage}%).`,
        { type: 'budget_alert', category, level: 'exceeded' }
      );
    } else if (percentage >= 80) {
      emitToUser(userId, 'budget:alert', {
        category,
        percentage,
        spent,
        limit: Number(budget.amount),
        level: 'warning',
      });
      await sendPushToUser(
        userId,
        `⚠️ Budget Warning: ${category}`,
        `You've used ${percentage}% of your ${category} budget (₨.${spent.toFixed(2)} / ₨.${Number(budget.amount).toFixed(2)}).`,
        { type: 'budget_alert', category, level: 'warning' }
      );
    }
  } catch (err) {
    console.error('[BudgetAlert] Error checking budget:', err);
  }
}


export async function getTransactionByUserId(req: AuthedRequest, res: any) {
    try {
        const requested = String(req.params.user_id);
        const authed = String(req.user!.id);
        if (requested !== authed) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const transactions = await TransactionModel.findByUserId(authed);
        res.status(200).json({ message: "Transactions fetched successfully", transactions });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
}

export async function createTransaction(req: AuthedRequest, res: any) {
    try {
        const { title, amount, category, created_at, currency, receipt_url } = req.body;
        const user_id = String(req.user!.id);

        const transaction = await TransactionModel.create(user_id, title, amount, category, created_at, currency, receipt_url || null);

        // ✅ Real-time notification to the same user
        emitToUser(user_id, 'tx:new', {
            title: 'New transaction',
            body: `${title} (${amount})`,
            transaction,
        });



        // ✅ Helpful event for re-fetching summary if you use it
        emitToUser(user_id, 'tx:summary:invalidate', { user_id });

        // ✅ Check budget thresholds for this category
        if (transaction.amount < 0) {
          await checkBudgetAlert(user_id, category);
        }

        res.status(201).json({ message: "Transaction created successfully", transaction });
    } catch (error) {
        console.log("Error creating transaction:", error);
        res.status(500).json({ message: "Server Error" });
    }
}

export async function deleteTransaction(req: AuthedRequest, res: any) {
    try {
        if (isNaN(Number(req.params.id))) {
            return res.status(400).json({ message: "Invalid transaction ID" });
        }

        const authedUserId = String(req.user!.id);

        // Fetch user_id for socket event
        const row = await sql`SELECT user_id, title, amount FROM transactions WHERE id = ${req.params.id}`;
        const userId = row?.[0]?.user_id;
        const title = row?.[0]?.title;

        if (!userId || String(userId) !== authedUserId) {
            return res.status(404).json({ message: 'Not found' });
        }

        await TransactionModel.deleteByUser(String(req.params.id), authedUserId);

        if (userId) {
            emitToUser(userId, 'tx:deleted', {
                title: 'Transaction deleted',
                body: title ? `${title} removed` : 'A transaction was removed',
                transaction_id: req.params.id,
            });

            emitToUser(userId, 'tx:summary:invalidate', { user_id: userId });
        }

        res.status(200).json({ message: "Transaction deleted successfully" });

    }
    catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
}

export async function getTransactionSummaryByUserId(req: AuthedRequest, res: any) {
    try {
        const requested = String(req.params.user_id);
        const authed = String(req.user!.id);
        if (requested !== authed) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // Get user's preferred currency
        const userRows = await sql`SELECT currency FROM users WHERE id = ${authed}`;
        const preferredCurrency = (userRows[0]?.currency as string) || 'LKR';

        // Get all transactions with their original currency
        const transactions = await sql`SELECT amount, currency FROM transactions WHERE user_id = ${authed}`;

        let income = 0;
        let expense = 0;

        for (const tx of transactions) {
          const amt = Number(tx.amount);
          const txCurrency = (tx.currency as string) || 'LKR';
          const converted = await convert(amt, txCurrency, preferredCurrency);
          if (converted > 0) income += converted;
          else expense += converted;
        }

        const balance = income + expense;

        res.status(200).json({
            balance: Math.round(balance * 100) / 100,
            income: Math.round(income * 100) / 100,
            expense: Math.round(expense * 100) / 100,
            currency: preferredCurrency,
        });
    }
    catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ message: "Server Error" });
    }
}

export async function getTransactionById(req: AuthedRequest, res: any) {
    try {
        const id = String(req.params.id);
        const authed = String(req.user!.id);
        const tx = await TransactionModel.findByIdAndUser(id, authed);
        if (!tx) return res.status(404).json({ message: 'Not found' });
        return res.json({ transaction: tx });
    } catch {
        return res.status(500).json({ message: 'Server Error' });
    }
}

export async function updateTransaction(req: AuthedRequest, res: any) {
    try {
        const id = String(req.params.id);
        const authed = String(req.user!.id);
        const { title, amount, category, created_at, currency, receipt_url } = req.body;
        const tx = await TransactionModel.updateByUser(id, authed, title, amount, category, created_at, currency, receipt_url !== undefined ? receipt_url : undefined);
        if (!tx) return res.status(404).json({ message: 'Not found' });

        emitToUser(authed, 'tx:updated', {
            title: 'Transaction updated',
            body: `${title} (${amount})`,
            transaction: tx,
        });
        emitToUser(authed, 'tx:summary:invalidate', { user_id: authed });

        // ✅ Check budget thresholds for this category
        if (tx.amount < 0) {
          await checkBudgetAlert(authed, category);
        }

        return res.json({ message: 'Transaction updated successfully', transaction: tx });
    } catch (e) {
        console.error('Error updating transaction:', e);
        return res.status(500).json({ message: 'Server Error' });
    }
}
