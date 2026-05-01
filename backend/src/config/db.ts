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
            biometric_enabled BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

        // Backward-compatible schema upgrades
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY'`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN NOT NULL DEFAULT false`;

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
            currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
            category VARCHAR(255) NOT NULL,
            created_at DATE NOT NULL DEFAULT CURRENT_DATE
        )`;

        await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'LKR'`;
        await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT`;

        await sql`CREATE TABLE IF NOT EXISTS transaction_splits(
            id SERIAL PRIMARY KEY,
            transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL,
            category VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            percentage DECIMAL(5,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

        await sql`ALTER TABLE transaction_splits ADD COLUMN IF NOT EXISTS percentage DECIMAL(5,2) NOT NULL DEFAULT 0`;
        await sql`CREATE INDEX IF NOT EXISTS idx_transaction_splits_user_id ON transaction_splits(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction_id ON transaction_splits(transaction_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_transaction_splits_user_category ON transaction_splits(user_id, category)`;

        await sql`CREATE TABLE IF NOT EXISTS transaction_tags(
            id SERIAL PRIMARY KEY,
            transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL,
            tag VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(transaction_id, tag)
        )`;
        await sql`CREATE INDEX IF NOT EXISTS idx_transaction_tags_user_id ON transaction_tags(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id ON transaction_tags(transaction_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_transaction_tags_user_tag ON transaction_tags(user_id, tag)`;

        await sql`CREATE TABLE IF NOT EXISTS categories(
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(20) NOT NULL DEFAULT 'expense',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, name)
        )`;

        await sql`CREATE TABLE IF NOT EXISTS budgets(
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            category VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
            period VARCHAR(20) NOT NULL DEFAULT 'monthly',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, category)
        )`;

        await sql`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'LKR'`;

        await sql`CREATE TABLE IF NOT EXISTS recurring_transactions(
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
            category VARCHAR(255) NOT NULL,
            frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
            next_run DATE NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

        await sql`ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'LKR'`;

        await sql`CREATE TABLE IF NOT EXISTS reminders(
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
            category VARCHAR(255) NOT NULL,
            due_date DATE NOT NULL,
            remind_days_before INTEGER NOT NULL DEFAULT 1,
            is_active BOOLEAN NOT NULL DEFAULT true,
            last_notified_on DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

        await sql`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'LKR'`;
        await sql`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS remind_days_before INTEGER NOT NULL DEFAULT 1`;
        await sql`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;
        await sql`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS last_notified_on DATE`;
        await sql`CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_reminders_user_active_due ON reminders(user_id, is_active, due_date)`;

        // ── Savings Goals ────────────────────────────────────────────────
        await sql`CREATE TABLE IF NOT EXISTS goals(
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            target_amount DECIMAL(10,2) NOT NULL,
            current_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
            deadline DATE,
            is_completed BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
        await sql`ALTER TABLE goals ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false`;

        // ── Transaction Receipts ─────────────────────────────────────────
        await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT`;

        console.log('Database initialized successfully')
    } catch (error) {
        console.error('Error initializing database', error)
        process.exit(1)
    }
}