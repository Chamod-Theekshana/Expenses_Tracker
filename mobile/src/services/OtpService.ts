import { API_URL } from '../config/env';

export class OtpService {
  static async sendOTP(email: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to send OTP');
  }

  static async verifyOTP(email: string, otp: string): Promise<{ signupToken: string }> {
    const response = await fetch(`${API_URL}/api/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Verification failed');
    return data;
  }
}
