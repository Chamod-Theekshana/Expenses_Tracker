import { API_URL } from '../config/env';
import { User } from '../models/User';

export class AuthService {
  static async signIn(email: string, password: string): Promise<{ user: User }> {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Sign in failed');
    return data;
  }

  static async signUp(email: string, password: string): Promise<{ user: User }> {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Sign up failed');
    return data;
  }

  static async sendPasskey(email: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/auth/send-passkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to send passkey');
  }

  static async verifyPasskey(email: string, passkey: string): Promise<{ signupToken: string }> {
    const response = await fetch(`${API_URL}/api/auth/verify-passkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passkey }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Verification failed');
    return data;
  }

  static async setPassword(
    email: string,
    password: string,
    signupToken: string,
    fcmToken?: string | null,
  ): Promise<{ user: { id: number; email: string } }> {
    const response = await fetch(`${API_URL}/api/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, signupToken, fcm_token: fcmToken || undefined }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create account');
    return data;
  }
}
