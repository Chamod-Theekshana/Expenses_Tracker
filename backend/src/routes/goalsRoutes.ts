import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { listGoals, createGoal, updateGoal, contributeToGoal, deleteGoal } from '../controllers/goalsController';

const router = express.Router();
router.use(requireAuth);

router.get('/', listGoals);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.post('/:id/contribute', contributeToGoal);
router.delete('/:id', deleteGoal);

export default router;
