import express from 'express';
import { saveUserToken } from '../services/pushService';
import { startTestNotifications, stopTestNotifications } from '../services/notificationScheduler';

const router = express.Router();

// Save user's FCM token (supports multiple devices per user)
router.post('/save-token', async (req, res) => {
  try {
    const { user_id, fcm_token } = req.body ?? {};

    if (!user_id || !fcm_token) {
      return res.status(400).json({ message: 'user_id and fcm_token are required' });
    }

    await saveUserToken(String(user_id), String(fcm_token));

    return res.json({ status: 200, message: 'Token saved' });
  } catch (err) {
    console.error('save-token error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
});

// Start periodic test notifications for a user (every 60s)
router.post('/start-test', async (req, res) => {
  try {
    const { user_id } = req.body ?? {};

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    await startTestNotifications(String(user_id));

    return res.json({ status: 200, message: 'Test notifications started (every 60s)' });
  } catch (err) {
    console.error('start-test error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
});

// Stop periodic test notifications for a user
router.post('/stop-test', async (req, res) => {
  try {
    const { user_id } = req.body ?? {};

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    stopTestNotifications(String(user_id));

    return res.json({ status: 200, message: 'Test notifications stopped' });
  } catch (err) {
    console.error('stop-test error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
