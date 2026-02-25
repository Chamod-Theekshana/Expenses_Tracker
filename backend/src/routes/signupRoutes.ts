import express from 'express';
import { sendPasskey, verifyPasskey, setPassword } from '../controllers/signupController';

const router = express.Router();

router.post('/send-passkey', sendPasskey);
router.post('/verify-passkey', verifyPasskey);
router.post('/set-password', setPassword);

export default router;
