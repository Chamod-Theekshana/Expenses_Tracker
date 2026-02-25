import express from 'express';
import { sendOTP, verifyOTPAndSignUp } from '../controllers/otpController';

const router = express.Router();

router.post('/send', sendOTP);
router.post('/verify', verifyOTPAndSignUp);

export default router;
