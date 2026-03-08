import type { Response } from 'express';
import { BudgetModel } from '../models/BudgetModel';
import { emitToUser } from '../socket';
import type { AuthedRequest } from '../middleware/requireAuth';

export async function listBudgets(req: AuthedRequest, res: Response) {
  try {
    const userId = String(req.user!.id);
    const rows = await BudgetModel.listByUser(userId);
    return res.json({ budgets: rows });
  } catch (e) {
    console.error('[Budgets] listBudgets error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function getBudgetStatus(req: AuthedRequest, res: Response) {
  try {
    const userId = String(req.user!.id);
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const day = req.query.day ? Number(req.query.day) : undefined;

    // Validate query params
    if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
      return res.status(400).json({ message: 'Invalid year' });
    }
    if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
      return res.status(400).json({ message: 'Invalid month' });
    }
    if (day !== undefined && (isNaN(day) || day < 1 || day > 31)) {
      return res.status(400).json({ message: 'Invalid day' });
    }

    const statuses = await BudgetModel.getStatusByUser(userId, year, month, day);
    return res.json({ budgets: statuses });
  } catch (e) {
    console.error('[Budgets] getBudgetStatus error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function createBudget(req: AuthedRequest, res: Response) {
  try {
    const userId = String(req.user!.id);
    const { category, amount, currency, period } = req.body || {};

    if (!category || typeof category !== 'string' || category.trim().length < 1) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    if (numAmount > 1_000_000_000) {
      return res.status(400).json({ message: 'Amount is too large' });
    }

    const p = (period || 'monthly') as string;
    if (!['monthly'].includes(p)) {
      return res.status(400).json({ message: 'Period must be: monthly' });
    }

    const c = (currency || 'LKR') as string;
    const row = await BudgetModel.create(userId, category.trim(), numAmount, c, p);

    // Real-time update for all devices
    emitToUser(userId, 'budget:created', { budget: row });

    return res.status(201).json({ budget: row });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return res.status(409).json({ message: 'A budget already exists for this category' });
    }
    console.error('[Budgets] createBudget error:', e);
    return res.status(500).json({ message: 'Failed to create budget' });
  }
}

export async function updateBudget(req: AuthedRequest, res: Response) {
  try {
    const userId = String(req.user!.id);
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid budget ID' });
    }

    const { amount } = req.body || {};
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    if (numAmount > 1_000_000_000) {
      return res.status(400).json({ message: 'Amount is too large' });
    }

    const row = await BudgetModel.update(userId, id, numAmount);
    if (!row) return res.status(404).json({ message: 'Budget not found' });

    emitToUser(userId, 'budget:updated', { budget: row });

    return res.json({ budget: row });
  } catch (e) {
    console.error('[Budgets] updateBudget error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function deleteBudget(req: AuthedRequest, res: Response) {
  try {
    const userId = String(req.user!.id);
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid budget ID' });
    }

    const ok = await BudgetModel.delete(userId, id);
    if (!ok) return res.status(404).json({ message: 'Budget not found' });

    emitToUser(userId, 'budget:deleted', { id });

    return res.json({ message: 'Budget deleted' });
  } catch (e) {
    console.error('[Budgets] deleteBudget error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
}
