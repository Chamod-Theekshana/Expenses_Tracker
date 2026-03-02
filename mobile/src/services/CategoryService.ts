import { apiFetch } from './http';

export type Category = {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'both';
};

export class CategoryService {
  static async list(): Promise<Category[]> {
    const data = await apiFetch<{ categories: any[] }>('/api/categories');
    return (data.categories || []).map((c) => ({
      id: String(c.id),
      name: String(c.name),
      type: (c.type as any) || 'expense',
    }));
  }

  static async create(name: string, type: Category['type'] = 'expense'): Promise<Category> {
    const data = await apiFetch<{ category: any }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
    return { id: String(data.category.id), name: data.category.name, type: data.category.type };
  }

  static async remove(id: string): Promise<void> {
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
  }
}
