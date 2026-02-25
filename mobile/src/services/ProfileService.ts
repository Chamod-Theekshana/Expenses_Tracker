import { API_URL } from '../config/env';
import { User } from '../models/User';

export class ProfileService {
  static async getProfile(userId: string): Promise<User> {
    const response = await fetch(`${API_URL}/api/profile/${userId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch profile');
    return {
      ...data.profile,
      profilePhoto: data.profile.profile_photo,
    };
  }

  static async updateProfile(
    userId: string,
    updates: { name?: string; profile_photo?: string; theme?: string; currency?: string; date_format?: string }
  ): Promise<User> {
    const response = await fetch(`${API_URL}/api/profile/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update profile');
    return {
      ...data.profile,
      profilePhoto: data.profile.profile_photo,
    };
  }

  static async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/profile/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update password');
  }
}
