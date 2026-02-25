import { UserModel } from '../models/UserModel';
import bcrypt from 'bcrypt';
import { emitToUser } from '../socket';
import { sendPushToUser } from '../services/pushService';

export async function getProfile(req: any, res: any) {
  try {
    const user = await UserModel.findById(req.params.user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...profile } = user;
    res.status(200).json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server Error" });
  }
}

export async function updateProfile(req: any, res: any) {
  try {
    const { name, profile_photo, theme, currency, date_format } = req.body;
    const userId = req.params.user_id;

    const user = await UserModel.updateProfile(userId, { name, profile_photo, theme, currency, date_format });
    const { password, ...profile } = user;

    // ✅ notify user in real-time
    emitToUser(userId, 'profile:updated', { profile });

    // ✅ Push (background/closed)
    await sendPushToUser(userId, 'Profile updated', 'Your profile settings were updated', { type: 'profile:updated' });

    res.status(200).json({ message: "Profile updated", profile });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server Error" });
  }
}

export async function updatePassword(req: any, res: any) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.user_id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(userId, hashedPassword);

    emitToUser(userId, 'profile:password:updated', { message: 'Password updated successfully' });

    await sendPushToUser(userId, 'Password updated', 'Your password was changed', { type: 'profile:password:updated' });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Server Error" });
  }
}
