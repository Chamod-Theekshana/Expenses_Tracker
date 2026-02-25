import express from 'express';
import { saveUserToken } from '../services/pushService';

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

export default router;
