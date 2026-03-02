import type { Response } from 'express';
import { CategoryModel } from '../models/CategoryModel';
import type { AuthedRequest } from '../middleware/requireAuth';

export async function listCategories(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const rows = await CategoryModel.listByUser(userId);
  return res.json({ categories: rows });
}

export async function createCategory(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const { name, type } = req.body || {};
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ message: 'Category name is required' });
  }
  const t = (type || 'expense') as 'expense' | 'income' | 'both';
  if (!['expense', 'income', 'both'].includes(t)) {
    return res.status(400).json({ message: 'Invalid category type' });
  }
  try {
    const row = await CategoryModel.create(userId, String(name).trim(), t);
    return res.status(201).json({ category: row });
  } catch (e: any) {
    return res.status(400).json({ message: 'Failed to create category (maybe duplicate?)' });
  }
}

export async function updateCategory(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const id = Number(req.params.id);
  const { name, type } = req.body || {};
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ message: 'Category name is required' });
  }
  const t = (type || 'expense') as 'expense' | 'income' | 'both';
  if (!['expense', 'income', 'both'].includes(t)) {
    return res.status(400).json({ message: 'Invalid category type' });
  }
  const row = await CategoryModel.update(userId, id, String(name).trim(), t);
  if (!row) return res.status(404).json({ message: 'Not found' });
  return res.json({ category: row });
}

export async function deleteCategory(req: AuthedRequest, res: Response) {
  const userId = String(req.user!.id);
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const ok = await CategoryModel.delete(userId, id);
  if (!ok) return res.status(404).json({ message: 'Not found' });
  return res.json({ message: 'Deleted' });
}
