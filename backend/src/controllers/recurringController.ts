import type { Response } from 'express';
import { RecurringModel } from '../models/RecurringModel';
import type { AuthedRequest } from '../middleware/requireAuth';
import { emitToUser } from '../socket';

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

export async function listRecurring(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const rows = await RecurringModel.listByUser(userId);
  return res.json({ recurring: rows });
}

export async function createRecurring(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const { title, amount, category, frequency, startDate } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length < 1) {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (!category || typeof category !== 'string' || category.trim().length < 1) {
    return res.status(400).json({ message: 'Category is required' });
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount === 0) {
    return res.status(400).json({ message: 'Amount must be a non-zero number' });
  }

  const freq = frequency || 'monthly';
  if (!VALID_FREQUENCIES.includes(freq)) {
    return res.status(400).json({ message: `Frequency must be one of: ${VALID_FREQUENCIES.join(', ')}` });
  }

  // Calculate next_run as the first future date based on frequency
  const now = new Date();
  if (!startDate) {
    if (freq === 'daily') now.setDate(now.getDate() + 1);
    else if (freq === 'weekly') now.setDate(now.getDate() + 7);
    else if (freq === 'yearly') now.setFullYear(now.getFullYear() + 1);
    else now.setMonth(now.getMonth() + 1); // monthly default
  }
  const nextRun = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  try {
    const row = await RecurringModel.create(userId, title.trim(), numAmount, category.trim(), freq, nextRun);

    // Socket notification (foreground/local only)
    emitToUser(userId, 'recurring:created', {
      title: '🔄 Recurring Added',
      body: `${title.trim()} (${freq}) — ${formatAmount(numAmount)}`,
      recurring: row,
    });

    return res.status(201).json({ recurring: row });
  } catch (e: any) {
    console.error('Error creating recurring transaction:', e);
    return res.status(500).json({ message: 'Failed to create recurring transaction' });
  }
}

export async function updateRecurring(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const id = Number(req.params.id);
  const { title, amount, category, frequency, is_active } = req.body || {};

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'Invalid recurring ID' });
  }

  if (frequency && !VALID_FREQUENCIES.includes(frequency)) {
    return res.status(400).json({ message: `Frequency must be one of: ${VALID_FREQUENCIES.join(', ')}` });
  }

  const fields: any = {};
  if (title !== undefined) fields.title = String(title).trim();
  if (amount !== undefined) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) return res.status(400).json({ message: 'Amount must be a non-zero number' });
    fields.amount = n;
  }
  if (category !== undefined) fields.category = String(category).trim();
  if (frequency !== undefined) fields.frequency = frequency;
  if (is_active !== undefined) fields.is_active = Boolean(is_active);

  const row = await RecurringModel.update(userId, id, fields);
  if (!row) return res.status(404).json({ message: 'Recurring transaction not found' });
  return res.json({ recurring: row });
}

export async function deleteRecurring(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const id = Number(req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'Invalid recurring ID' });
  }

  const existing = await RecurringModel.findById(userId, id);
  const ok = await RecurringModel.delete(userId, id);
  if (!ok) return res.status(404).json({ message: 'Recurring transaction not found' });

  // Socket notification (foreground/local only)
  const ruleTitle = existing?.title || 'Recurring rule';
  emitToUser(userId, 'recurring:deleted', {
    title: '🗑️ Recurring Removed',
    body: `${ruleTitle} has been removed`,
    id,
  });

  return res.json({ message: 'Recurring transaction deleted' });
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount).toFixed(2);
  return amount < 0 ? `-₨.${abs}` : `₨.${abs}`;
}
