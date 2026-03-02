import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  listBudgets,
  getBudgetStatus,
  createBudget,
  updateBudget,
  deleteBudget,
} from '../controllers/budgetsController';

const router = express.Router();

router.use(requireAuth);

router.get('/', listBudgets);
router.get('/status', getBudgetStatus);
router.post('/', createBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
