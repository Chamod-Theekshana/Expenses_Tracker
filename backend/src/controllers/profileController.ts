import { UserModel } from '../models/UserModel';
import bcrypt from 'bcrypt';
import { emitToUser } from '../socket';
import { sendPushToUser } from '../services/pushService';
import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/requireAuth';

export async function getProfile(req: AuthedRequest, res: Response) {
  try {
    const requested = String(req.params.user_id);
    const authed = String(req.user!.id);
    if (requested !== authed) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await UserModel.findById(authed);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...profile } = user;
    return res.status(200).json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function updateProfile(req: AuthedRequest, res: Response) {
  try {
    const { name, profile_photo, theme, currency, date_format } = req.body;
    const requested = String(req.params.user_id);
    const userId = String(req.user!.id);
    if (requested !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await UserModel.updateProfile(userId, { name, profile_photo, theme, currency, date_format });
    const { password, ...profile } = user;

    emitToUser(userId, 'profile:updated', { profile });

    return res.status(200).json({ message: 'Profile updated', profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function updatePassword(req: AuthedRequest, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    const requested = String(req.params.user_id);
    const userId = String(req.user!.id);
    if (requested !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(String(currentPassword), user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 12);
    await UserModel.updatePassword(userId, hashedPassword);

    emitToUser(userId, 'profile:password:updated', { message: 'Password updated successfully' });
    await sendPushToUser(userId, 'Password updated', 'Your password was changed successfully', { type: 'profile:password:updated' });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
}
