import { User } from '../models/User';
import { apiFetch } from './http';

export class AuthService {
  static async signIn(email: string, password: string): Promise<{ user: User; token: string; refreshToken?: string }> {
    return apiFetch('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async signUp(email: string, password: string): Promise<{ user: User; token: string; refreshToken?: string }> {
    return apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async sendPasskey(email: string): Promise<void> {
    await apiFetch('/api/auth/send-passkey', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  static async verifyPasskey(email: string, passkey: string): Promise<{ signupToken: string }> {
    return apiFetch('/api/auth/verify-passkey', {
      method: 'POST',
      body: JSON.stringify({ email, passkey }),
    });
  }

  static async setPassword(
    email: string,
    password: string,
    signupToken: string,
    fcmToken?: string | null,
  ): Promise<{ user: { id: number; email: string }; token: string }> {
    return apiFetch('/api/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ email, password, signupToken, fcm_token: fcmToken || undefined }),
    });
  }
}
