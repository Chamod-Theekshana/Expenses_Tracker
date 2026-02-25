import { UserModel } from '../models/UserModel';
import { sendPasskeyEmail } from '../config/nodemailer';
import {
  generateOTP,
  storeOTP,
  verifyOTP,
  verifySignupToken,
  clearSignupSession,
  canResendOTP,
  validatePassword,
} from '../config/signupAuth';
import bcrypt from 'bcrypt';
import { saveUserToken, sendPushToUser } from '../services/pushService';

export async function sendPasskey(req: any, res: any) {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await UserModel.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const { allowed, waitSeconds } = canResendOTP(normalizedEmail);
    if (!allowed) {
      return res.status(429).json({ message: `Please wait ${waitSeconds}s before resending` });
    }

    const otp = generateOTP();
    storeOTP(normalizedEmail, otp);

    await sendPasskeyEmail(normalizedEmail, otp);

    res.status(200).json({ message: 'Passkey sent to email' });
  } catch (error) {
    console.error('Error sending passkey:', error);
    res.status(500).json({ message: 'Failed to send passkey' });
  }
}

export async function verifyPasskey(req: any, res: any) {
  try {
    const { email, passkey } = req.body;

    if (!email || !passkey) {
      return res.status(400).json({ message: 'Email and passkey are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { valid, message, signupToken } = verifyOTP(normalizedEmail, passkey);

    if (!valid) {
      return res.status(401).json({ message });
    }

    res.status(200).json({
      message: 'Passkey verified',
      signupToken,
    });
  } catch (error) {
    console.error('Error verifying passkey:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
}

export async function setPassword(req: any, res: any) {
  try {
    const { email, password, signupToken, fcm_token } = req.body;

    if (!email || !password || !signupToken) {
      return res.status(400).json({ message: 'Email, password, and signup token are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate signup token
    const tokenCheck = verifySignupToken(normalizedEmail, signupToken);
    if (!tokenCheck.valid) {
      return res.status(401).json({ message: tokenCheck.message });
    }

    // Validate password
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    // Check if user already exists
    const existing = await UserModel.findByEmail(normalizedEmail);
    if (existing) {
      clearSignupSession(normalizedEmail);
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await UserModel.create(normalizedEmail, passwordHash);

    // Clear signup session
    clearSignupSession(normalizedEmail);

    // Save FCM token and send welcome push if token was provided
    if (fcm_token && user.id) {
      console.log('[Push] Saving FCM token for new user:', user.id);
      await saveUserToken(String(user.id), String(fcm_token));

      // Send welcome push notification
      await sendPushToUser(
        String(user.id),
        'Welcome to PulseSpend! 🎉',
        'Your account is ready. Start tracking your expenses!',
        { type: 'welcome' }
      );
      console.log('[Push] Welcome push sent to user:', user.id);
    }

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ message: 'Failed to create account' });
  }
}
