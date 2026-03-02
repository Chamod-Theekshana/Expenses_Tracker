import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  listRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from '../controllers/recurringController';

const router = express.Router();

router.use(requireAuth);

router.get('/', listRecurring);
router.post('/', createRecurring);
router.put('/:id', updateRecurring);
router.delete('/:id', deleteRecurring);

export default router;
