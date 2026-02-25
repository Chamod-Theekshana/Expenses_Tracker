import { sql } from '../config/db';
import { generateOTP, storeOTP, verifyOTP, canResendOTP, updateResendTime } from '../config/otp';
import { sendOTPEmail } from '../config/email';
import crypto from 'crypto';

export async function sendOTP(req: any, res: any) {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const { allowed, waitSeconds } = canResendOTP(email);
    if (!allowed) {
      return res.status(429).json({ message: `Please wait ${waitSeconds}s before resending` });
    }

    const otp = generateOTP();
    storeOTP(email, otp);
    updateResendTime(email);

    await sendOTPEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
}

export async function verifyOTPAndSignUp(req: any, res: any) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const { valid, message } = verifyOTP(email, otp);
    if (!valid) {
      return res.status(401).json({ message });
    }

    // Check if user exists
    let user = await sql`SELECT id, email FROM users WHERE email = ${email.toLowerCase()}`;

    // Create user if doesn't exist
    if (user.length === 0) {
      const result = await sql`
        INSERT INTO users (email, password)
        VALUES (${email.toLowerCase()}, ${crypto.randomBytes(32).toString('hex')})
        RETURNING id, email
      `;
      user = result;
    }

    // Generate JWT token (simple implementation)
    const token = crypto.randomBytes(32).toString('hex');

    res.status(200).json({
      message: 'Verified successfully',
      user: { id: user[0].id, email: user[0].email },
      token,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
}
