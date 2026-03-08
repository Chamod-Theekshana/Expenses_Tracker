import { GoalModel } from '../models/GoalModel';
import { emitToUser } from '../socket';
import type { AuthedRequest } from '../middleware/requireAuth';

export async function listGoals(req: AuthedRequest, res: any) {
  try {
    const userId = String(req.user!.id);
    const goals = await GoalModel.listByUser(userId);
    return res.json({ goals });
  } catch (e) {
    console.error('[Goals] listGoals error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function createGoal(req: AuthedRequest, res: any) {
  try {
    const userId = String(req.user!.id);
    const { name, target_amount, currency, deadline } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Goal name is required' });
    }
    if (!target_amount || isNaN(Number(target_amount)) || Number(target_amount) <= 0) {
      return res.status(400).json({ message: 'target_amount must be a positive number' });
    }
    if (deadline && new Date(deadline).getTime() < new Date().setHours(0,0,0,0)) {
        return res.status(400).json({ message: 'Deadline cannot be in the past' });
    }

    const goal = await GoalModel.create(
      userId,
      name.trim(),
      Number(target_amount),
      currency || 'LKR',
      deadline || null,
    );
    return res.status(201).json({ goal });
  } catch (e) {
    console.error('[Goals] createGoal error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function updateGoal(req: AuthedRequest, res: any) {
  try {
    const userId = String(req.user!.id);
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid goal ID' });

    const { name, target_amount, currency, deadline } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Goal name is required' });
    }
    if (!target_amount || isNaN(Number(target_amount)) || Number(target_amount) <= 0) {
      return res.status(400).json({ message: 'target_amount must be a positive number' });
    }
    if (deadline && new Date(deadline).getTime() < new Date().setHours(0,0,0,0)) {
        return res.status(400).json({ message: 'Deadline cannot be in the past' });
    }

    const goal = await GoalModel.update(userId, id, name.trim(), Number(target_amount), currency || 'LKR', deadline || null);
    if (!goal) return res.status(404).json({ message: 'Not found' });
    return res.json({ goal });
  } catch (e) {
    console.error('[Goals] updateGoal error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function contributeToGoal(req: AuthedRequest, res: any) {
  try {
    const userId = String(req.user!.id);
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid goal ID' });

    const { amount, currency } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    // Fetch the goal to know its target currency
    const existing = await GoalModel.findById(userId, id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    let contributionAmount = Number(amount);
    const fromCurrency = (currency || existing.currency || 'LKR').toUpperCase();
    const toCurrency = (existing.currency || 'LKR').toUpperCase();

    // Convert contribution to the goal's currency if they differ
    if (fromCurrency !== toCurrency) {
      try {
        const { convert } = await import('../services/exchangeRateService');
        contributionAmount = await convert(contributionAmount, fromCurrency, toCurrency);
      } catch (e) {
        console.warn(`[Goals] Currency conversion ${fromCurrency}→${toCurrency} failed, using raw amount:`, e);
        // Proceed with raw amount but flag it in the response
        const goal = await GoalModel.addContribution(userId, id, contributionAmount);
        if (!goal) return res.status(404).json({ message: 'Not found' });
        if (goal.is_completed) emitToUser(userId, 'goal:completed', { goal });
        return res.json({ goal, conversion_warning: `Rate unavailable for ${fromCurrency}→${toCurrency}. Amount recorded as-is.` });
      }
    }

    const goal = await GoalModel.addContribution(userId, id, contributionAmount);
    if (!goal) return res.status(404).json({ message: 'Not found' });

    if (goal.is_completed) {
      emitToUser(userId, 'goal:completed', { goal });
    }

    return res.json({ goal });
  } catch (e) {
    console.error('[Goals] contributeToGoal error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function deleteGoal(req: AuthedRequest, res: any) {
  try {
    const userId = String(req.user!.id);
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid goal ID' });

    await GoalModel.delete(userId, id);
    return res.json({ message: 'Goal deleted successfully' });
  } catch (e) {
    console.error('[Goals] deleteGoal error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
}
