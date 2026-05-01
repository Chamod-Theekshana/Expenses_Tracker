import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { validateNumericParam } from '../middleware/validators';
import {
  createReminder,
  deleteReminder,
  listReminders,
  updateReminder,
} from '../controllers/remindersController';

const router = express.Router();

router.use(requireAuth);

router.get('/', listReminders);
router.post('/', createReminder);
router.put('/:id', validateNumericParam('id'), updateReminder);
router.delete('/:id', validateNumericParam('id'), deleteReminder);

export default router;
