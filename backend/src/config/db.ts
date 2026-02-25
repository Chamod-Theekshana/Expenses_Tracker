import { neon } from "@neondatabase/serverless"
import 'dotenv/config';

export const sql = neon(process.env.DATABASE_URL!);

export async function initDB() {
    try {
        await sql`CREATE TABLE IF NOT EXISTS users(
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            profile_photo TEXT,
            theme VARCHAR(20) DEFAULT 'dark',
            currency VARCHAR(10) DEFAULT 'USD',
            date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

        // Backward-compatible schema upgrades
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY'`;

        // ✅ FCM tokens table (supports multiple devices per user)
        await sql`CREATE TABLE IF NOT EXISTS user_fcm_tokens(
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

        await sql`CREATE TABLE IF NOT EXISTS transactions(
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            category VARCHAR(255) NOT NULL,
            created_at DATE NOT NULL DEFAULT CURRENT_DATE
        )`;
        console.log('Database initialized successfully')
    } catch (error) {
        console.error('Error initializing database', error)
        process.exit(1)
    }
}