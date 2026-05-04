import { getSecureItem, removeSecureItem, setSecureItem } from './secureStorage';

type AuthSession = {
  email: string;
  id: string;
  token: string;
  refreshToken: string | null;
};

const STORAGE_KEY = 'expense_tracker_auth_v1';

let currentSession: AuthSession | null = null;
const listeners = new Set<(session: AuthSession | null) => void>();

function notify() {
  for (const cb of listeners) {
    try {
      cb(currentSession);
    } catch {
      // ignore listener errors
    }
  }
}

export function getSession(): AuthSession | null {
  return currentSession;
}

export async function loadSession(): Promise<AuthSession | null> {
  try {
    const raw = await getSecureItem(STORAGE_KEY);
    if (!raw) {
      currentSession = null;
      notify();
      return null;
    }
    const parsed = JSON.parse(raw);
    const session: AuthSession = {
      email: String(parsed?.email || ''),
      id: String(parsed?.id || ''),
      token: String(parsed?.token || ''),
      refreshToken: parsed?.refreshToken ? String(parsed.refreshToken) : null,
    };
    if (!session.email || !session.id || !session.token) {
      currentSession = null;
      notify();
      return null;
    }
    currentSession = session;
    notify();
    return session;
  } catch {
    currentSession = null;
    notify();
    return null;
  }
}

export async function saveSession(session: AuthSession): Promise<void> {
  currentSession = session;
  await setSecureItem(STORAGE_KEY, JSON.stringify(session));
  notify();
}

export async function clearSession(): Promise<void> {
  currentSession = null;
  await removeSecureItem(STORAGE_KEY).catch(() => {});
  notify();
}

export async function updateTokens(token: string, refreshToken: string | null): Promise<void> {
  if (!currentSession) return;
  const updated: AuthSession = {
    ...currentSession,
    token,
    refreshToken,
  };
  await saveSession(updated);
}

export function subscribeSession(listener: (session: AuthSession | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
