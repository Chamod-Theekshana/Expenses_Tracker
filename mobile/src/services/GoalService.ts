import { apiFetch } from './http';

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  deadline?: string | null;
  is_completed: boolean;
  created_at: string;
  progress_percentage: number;
}

function mapGoal(g: any): Goal {
  return {
    id: String(g.id),
    name: String(g.name),
    target_amount: Number(g.target_amount),
    current_amount: Number(g.current_amount),
    currency: String(g.currency || 'LKR'),
    deadline: g.deadline || null,
    is_completed: Boolean(g.is_completed),
    created_at: String(g.created_at),
    progress_percentage: Number(g.progress_percentage ?? 0),
  };
}

export class GoalService {
  static async list(): Promise<Goal[]> {
    const data = await apiFetch<{ goals: any[] }>('/api/goals');
    return (data.goals || []).map(mapGoal);
  }

  static async create(
    name: string,
    targetAmount: number,
    currency: string,
    deadline?: string | null,
  ): Promise<Goal> {
    const data = await apiFetch<{ goal: any }>('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ name, target_amount: targetAmount, currency, deadline }),
    });
    return mapGoal(data.goal);
  }

  static async update(
    id: string,
    name: string,
    targetAmount: number,
    currency: string,
    deadline?: string | null,
  ): Promise<Goal> {
    const data = await apiFetch<{ goal: any }>(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, target_amount: targetAmount, currency, deadline }),
    });
    return mapGoal(data.goal);
  }

  static async contribute(id: string, amount: number): Promise<Goal> {
    const data = await apiFetch<{ goal: any }>(`/api/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return mapGoal(data.goal);
  }

  static async remove(id: string): Promise<void> {
    await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
  }
}
