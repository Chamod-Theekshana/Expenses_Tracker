import admin from 'firebase-admin';
import { sql } from '../config/db';
import * as fs from 'fs';
import * as path from 'path';

let initAttempted = false;
let enabled = false;
let disabledReason: string | null = null;

function initFirebaseOnce() {
  if (initAttempted) return;
  initAttempted = true;

  try {
    if (admin.apps.length) {
      enabled = true;
      console.log('[Push Backend] Firebase already initialized');
      return;
    }

    // Option 1: JSON string in env FIREBASE_SERVICE_ACCOUNT_JSON
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json && json.trim().length > 0) {
      const serviceAccount = JSON.parse(json);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      enabled = true;
      console.log('[Push Backend] Firebase initialized from FIREBASE_SERVICE_ACCOUNT_JSON');
      return;
    }

    // Option 2: Read service account file from GOOGLE_APPLICATION_CREDENTIALS
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      const resolvedPath = path.resolve(credPath);
      console.log('[Push Backend] Reading service account from:', resolvedPath);

      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Service account file not found: ${resolvedPath}`);
      }

      const fileContents = fs.readFileSync(resolvedPath, 'utf8');
      const serviceAccount = JSON.parse(fileContents);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      enabled = true;
      console.log('[Push Backend] ✅ Firebase initialized from', resolvedPath);
      return;
    }

    throw new Error('No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS');
  } catch (err: any) {
    enabled = false;
    disabledReason = err?.message || 'Firebase init failed';
    console.error('[Push Backend] ❌ Firebase init FAILED:', disabledReason);
  }
}

export function isPushEnabled() {
  initFirebaseOnce();
  return enabled;
}

export function getPushDisabledReason() {
  initFirebaseOnce();
  return disabledReason;
}

export async function saveUserToken(userId: string | number, token: string) {
  const uid = String(userId);
  const t = String(token);
  if (!uid || !t) return;

  await sql`
    INSERT INTO user_fcm_tokens (user_id, token)
    VALUES (${uid}, ${t})
    ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id
  `;
}

async function getUserTokens(userId: string | number): Promise<string[]> {
  const uid = String(userId);
  const rows = await sql`SELECT token FROM user_fcm_tokens WHERE user_id = ${uid}`;
  return rows.map((r: any) => r.token).filter(Boolean);
}

async function removeTokens(tokens: string[]) {
  if (!tokens.length) return;
  await sql`DELETE FROM user_fcm_tokens WHERE token = ANY(${tokens}::text[])`;
}

export async function sendPushToUser(
  userId: string | number,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  console.log('[Push Backend] sendPushToUser called — userId:', userId, 'title:', title);

  initFirebaseOnce();
  if (!enabled) {
    console.error('[Push Backend] ❌ Push disabled! Reason:', disabledReason);
    return;
  }

  const tokens = await getUserTokens(userId);
  console.log('[Push Backend] Tokens for user', userId, ':', tokens.length, 'found');
  if (!tokens.length) {
    console.warn('[Push Backend] ⚠️ No tokens found for user', userId, '— cannot send push');
    return;
  }

  try {
    const msg: admin.messaging.MulticastMessage = {
      tokens,
      data: { title, body, ...(data ?? {}) },
      android: { priority: 'high' as const },
    };

    console.log('[Push Backend] Sending FCM message to', tokens.length, 'device(s)...');
    const resp = await admin.messaging().sendEachForMulticast(msg);
    console.log('[Push Backend] FCM response — success:', resp.successCount, 'failure:', resp.failureCount);

    // Log individual failures
    resp.responses.forEach((r: any, idx: number) => {
      if (!r.success) {
        console.error('[Push Backend] ❌ Token failed:', tokens[idx]?.slice(0, 20) + '...', 'error:', r.error?.code, r.error?.message);
      }
    });

    // Clean up invalid tokens
    const invalid: string[] = [];
    resp.responses.forEach((r: any, idx: number) => {
      if (!r.success) {
        const code = (r.error as any)?.code || '';
        if (String(code).includes('registration-token-not-registered') ||
          String(code).includes('invalid-argument')) {
          invalid.push(tokens[idx]);
        }
      }
    });
    if (invalid.length) await removeTokens(invalid);
  } catch (err) {
    console.error('[Push Backend] ❌ sendEachForMulticast FAILED:', err);
  }
}

