import express from 'express';
import { saveUserToken } from '../services/pushService';
import { startTestNotifications, stopTestNotifications } from '../services/notificationScheduler';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = express.Router();

router.use(requireAuth);

// Save user's FCM token (supports multiple devices per user)
router.post('/save-token', asyncHandler(async (req, res) => {
  try {
    const { fcm_token } = req.body ?? {};
    const user_id = String((req as any).user?.id);

    if (!user_id || !fcm_token) {
      return res.status(400).json({ message: 'fcm_token is required' });
    }

    await saveUserToken(String(user_id), String(fcm_token));

    return res.json({ status: 200, message: 'Token saved' });
  } catch (err) {
    console.error('save-token error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
}));

// Start periodic test notifications for a user (every 60s)
router.post('/start-test', asyncHandler(async (req, res) => {
  try {
    const user_id = String((req as any).user?.id);
    await startTestNotifications(user_id);
    return res.json({ status: 200, message: 'Test notifications started (every 60s)' });
  } catch (err) {
    console.error('start-test error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
}));

// Stop periodic test notifications for a user
router.post('/stop-test', asyncHandler(async (req, res) => {
  try {
    const user_id = String((req as any).user?.id);
    stopTestNotifications(user_id);

    return res.json({ status: 200, message: 'Test notifications stopped' });
  } catch (err) {
    console.error('stop-test error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
}));

export default router;
