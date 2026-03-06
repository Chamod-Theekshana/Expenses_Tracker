import type { Response } from 'express';
import { BudgetModel } from '../models/BudgetModel';
import type { AuthedRequest } from '../middleware/requireAuth';

export async function listBudgets(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const rows = await BudgetModel.listByUser(userId);
  return res.json({ budgets: rows });
}

export async function getBudgetStatus(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;
  const day = req.query.day ? Number(req.query.day) : undefined;
  const statuses = await BudgetModel.getStatusByUser(userId, year, month, day);
  return res.json({ budgets: statuses });
}

export async function createBudget(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const { category, amount, currency, period } = req.body || {};

  if (!category || typeof category !== 'string' || category.trim().length < 1) {
    return res.status(400).json({ message: 'Category is required' });
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  const validPeriods = ['monthly'];
  const p = (period || 'monthly') as string;
  if (!validPeriods.includes(p)) {
    return res.status(400).json({ message: 'Period must be: monthly' });
  }

  try {
    const c = (currency || 'LKR') as string;
    const row = await BudgetModel.create(userId, category.trim(), numAmount, c, p);
    return res.status(201).json({ budget: row });
  } catch (e: any) {
    if (String(e?.message || '').includes('duplicate') || String(e?.message || '').includes('unique')) {
      return res.status(400).json({ message: 'A budget already exists for this category' });
    }
    console.error('Error creating budget:', e);
    return res.status(500).json({ message: 'Failed to create budget' });
  }
}

export async function updateBudget(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const id = Number(req.params.id);
  const { amount } = req.body || {};

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'Invalid budget ID' });
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  const row = await BudgetModel.update(userId, id, numAmount);
  if (!row) return res.status(404).json({ message: 'Budget not found' });
  return res.json({ budget: row });
}

export async function deleteBudget(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const id = Number(req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'Invalid budget ID' });
  }

  const ok = await BudgetModel.delete(userId, id);
  if (!ok) return res.status(404).json({ message: 'Budget not found' });
  return res.json({ message: 'Budget deleted' });
}
