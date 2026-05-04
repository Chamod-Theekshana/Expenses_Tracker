import { API_URL } from '../config/env';
import { clearSession, getSession, updateTokens } from './authSession';

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export function getApiAuthToken(): string | null {
  return authToken;
}

type ApiFetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  timeout?: number;
  skipAuthRefresh?: boolean;
  retryCount?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_RETRY_DELAY_MS = 500;

let refreshPromise: Promise<string | null> | null = null;

function isAuthRoute(path: string): boolean {
  return path.includes('/api/auth/refresh') || path.includes('/api/auth/signin') || path.includes('/api/auth/signup');
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const session = getSession();
  if (!session?.refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const resp = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!resp.ok) {
        await clearSession();
        return null;
      }

      const data = await resp.json();
      const newToken = String(data?.token || '');
      const newRefresh = data?.refreshToken ? String(data.refreshToken) : session.refreshToken;
      if (!newToken) {
        await clearSession();
        return null;
      }

      await updateTokens(newToken, newRefresh);
      setApiAuthToken(newToken);
      return newToken;
    } catch {
      await clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers: Record<string, string> = { ...(options.headers || {}) };

  if (!headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const method = (options.method || 'GET').toUpperCase();
  const maxRetries = options.retryCount ?? (method === 'GET' || method === 'HEAD' ? DEFAULT_RETRY_COUNT : 0);

  let attempt = 0;
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const { timeout, skipAuthRefresh, retryCount, ...restOptions } = options;
      const resp = await fetch(url, {
        ...restOptions,
        headers,
        signal: controller.signal,
      });

      const text = await resp.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!resp.ok) {
        if (resp.status === 401 && !skipAuthRefresh && !isAuthRoute(path)) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            attempt += 1;
            continue;
          }
        }
        const msg = (data && (data.message || data.error)) || `Request failed (${resp.status})`;
        const err = new Error(msg) as any;
        err.status = resp.status;
        throw err;
      }

      return data as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Request timed out. Please check your connection.') as any;
        timeoutErr.code = 'TIMEOUT';
        err = timeoutErr;
      }

      const shouldRetry = !err.status && attempt < maxRetries;
      if (shouldRetry) {
        const backoff = DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt);
        attempt += 1;
        await wait(backoff);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('Request failed after retries');
}
