import { User } from '../models/User';
import { apiFetch } from './http';

export class ProfileService {
  static async getProfile(userId: string): Promise<User> {
    const data = await apiFetch<any>(`/api/profile/${userId}`);
    return {
      ...data.profile,
      profilePhoto: data.profile.profile_photo,
    };
  }

  static async updateProfile(
    userId: string,
    updates: { name?: string; profile_photo?: string; theme?: string; currency?: string; date_format?: string }
  ): Promise<User> {
    const data = await apiFetch<any>(`/api/profile/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return {
      ...data.profile,
      profilePhoto: data.profile.profile_photo,
    };
  }

  static async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await apiFetch(`/api/profile/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }
}
