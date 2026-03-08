import { sql } from '../config/db';
import { generateOTP, storeOTP, verifyOTP, canResendOTP, updateResendTime } from '../config/otp';
import { sendOTPEmail } from '../config/email';
import { signAccessToken } from '../utils/jwt';
import { CategoryModel } from '../models/CategoryModel';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendOTP(req: Request, res: Response) {
  try {
    const { email } = req.body ?? {};

    if (!email || !EMAIL_REGEX.test(String(email))) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const { allowed, waitSeconds } = canResendOTP(normalizedEmail);
    if (!allowed) {
      return res.status(429).json({ message: `Please wait ${waitSeconds}s before resending` });
    }

    const otp = generateOTP();
    storeOTP(normalizedEmail, otp);
    updateResendTime(normalizedEmail);

    await sendOTPEmail(normalizedEmail, otp);

    return res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
}

export async function verifyOTPAndSignUp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body ?? {};

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const { valid, message } = verifyOTP(normalizedEmail, String(otp));
    if (!valid) {
      return res.status(401).json({ message });
    }

    let userRows = await sql`SELECT id, email FROM users WHERE email = ${normalizedEmail}`;
    let user = userRows[0] as any;

    if (!user) {
      // Create user with a random non-usable password (OTP-based accounts)
      const randomHash = await bcrypt.hash(Math.random().toString(36), 12);
      const result = await sql`
        INSERT INTO users (email, password)
        VALUES (${normalizedEmail}, ${randomHash})
        RETURNING id, email
      `;
      user = (result as any)[0];
      await CategoryModel.seedDefaults(String(user.id));
    }

    // Issue a proper JWT token (not random bytes)
    const token = signAccessToken({ id: user.id, email: user.email });

    return res.status(200).json({
      message: 'Verified successfully',
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ message: 'Verification failed' });
  }
}
