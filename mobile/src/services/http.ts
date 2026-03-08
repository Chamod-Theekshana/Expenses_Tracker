import { API_URL } from '../config/env';

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
};

const DEFAULT_TIMEOUT_MS = 15_000;

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { timeout, ...restOptions } = options;
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
      const msg = (data && (data.message || data.error)) || `Request failed (${resp.status})`;
      const err = new Error(msg) as any;
      err.status = resp.status;
      throw err;
    }

    return data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
