import { UserModel } from '../models/UserModel';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../utils/jwt';
import { CategoryModel } from '../models/CategoryModel';
import type { Request, Response } from 'express';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUp(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!EMAIL_REGEX.test(String(email))) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await UserModel.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);
    const user = await UserModel.create(normalizedEmail, hashedPassword);

    await CategoryModel.seedDefaults(String(user.id));

    const token = signAccessToken({ id: user.id, email: user.email });

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Error in signUp:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
}

export async function signIn(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await UserModel.findByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signAccessToken({ id: user.id, email: user.email });

    return res.status(200).json({
      message: 'Sign in successful',
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Error in signIn:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
}
