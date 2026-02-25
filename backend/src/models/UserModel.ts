import { sql } from '../config/db';

export interface User {
  id: number;
  email: string;
  password: string;
  name?: string | null;
  profile_photo?: string | null;
  theme?: 'dark' | 'light' | string | null;
  currency?: string | null;
  date_format?: string | null;
  created_at?: Date;
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    return (result[0] as User) || null;
  }

  static async findById(id: string): Promise<User | null> {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    return (result[0] as User) || null;
  }

  static async create(email: string, hashedPassword: string): Promise<User> {
    const result = await sql`
      INSERT INTO users (email, password)
      VALUES (${email}, ${hashedPassword})
      RETURNING *
    `;
    return result[0] as User;
  }

  /**
   * Updates profile fields. Any field not provided will remain unchanged.
   * Uses COALESCE to keep existing values.
   */
  static async updateProfile(
    userId: string,
    updates: {
      name?: string;
      profile_photo?: string;
      theme?: string;
      currency?: string;
      date_format?: string;
    }
  ): Promise<User> {
    const hasAny =
      updates.name !== undefined ||
      updates.profile_photo !== undefined ||
      updates.theme !== undefined ||
      updates.currency !== undefined ||
      updates.date_format !== undefined;

    if (!hasAny) {
      const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
      return result[0] as User;
    }

    const result = await sql`
      UPDATE users
      SET
        name = COALESCE(${updates.name ?? null}, name),
        profile_photo = COALESCE(${updates.profile_photo ?? null}, profile_photo),
        theme = COALESCE(${updates.theme ?? null}, theme),
        currency = COALESCE(${updates.currency ?? null}, currency),
        date_format = COALESCE(${updates.date_format ?? null}, date_format)
      WHERE id = ${userId}
      RETURNING *
    `;

    return result[0] as User;
  }

  static async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${userId}`;
  }
}
