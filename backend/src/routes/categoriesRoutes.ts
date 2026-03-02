import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../controllers/categoriesController';

const router = express.Router();

router.use(requireAuth);

router.get('/', listCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
