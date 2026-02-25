import {createHash} from 'crypto';

export interface OTPRecord {
  email: string;
  hashedOtp: string;
  attempts: number;
  expiresAt: number;
  createdAt: number;
  lastResendAt: number;
}

const otpStore = new Map<string, OTPRecord>();

const RESEND_COOLDOWN = 30 * 1000; // 30 seconds
const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashOTP(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

export function storeOTP(email: string, otp: string): void {
  const now = Date.now();
  otpStore.set(email, {
    email,
    hashedOtp: hashOTP(otp),
    attempts: 0,
    expiresAt: now + OTP_EXPIRY,
    createdAt: now,
    lastResendAt: now,
  });
}

export function verifyOTP(email: string, otp: string): { valid: boolean; message: string } {
  const record = otpStore.get(email);

  if (!record) {
    return { valid: false, message: 'No OTP found for this email' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { valid: false, message: 'OTP expired' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(email);
    return { valid: false, message: 'Max attempts exceeded' };
  }

  record.attempts++;

  if (hashOTP(otp) === record.hashedOtp) {
    otpStore.delete(email);
    return { valid: true, message: 'OTP verified' };
  }

  return { valid: false, message: 'Invalid OTP' };
}

export function canResendOTP(email: string): { allowed: boolean; waitSeconds: number } {
  const record = otpStore.get(email);

  if (!record) {
    return { allowed: true, waitSeconds: 0 };
  }

  const timeSinceLastResend = Date.now() - record.lastResendAt;
  if (timeSinceLastResend < RESEND_COOLDOWN) {
    return { allowed: false, waitSeconds: Math.ceil((RESEND_COOLDOWN - timeSinceLastResend) / 1000) };
  }

  return { allowed: true, waitSeconds: 0 };
}

export function updateResendTime(email: string): void {
  const record = otpStore.get(email);
  if (record) {
    record.lastResendAt = Date.now();
  }
}
