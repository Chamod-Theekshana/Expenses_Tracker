import { API_URL } from '../config/env';

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

type ApiFetchOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

export async function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (!headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const resp = await fetch(url, { ...options, headers });
  const text = await resp.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!resp.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${resp.status})`;
    throw new Error(msg);
  }
  return data as T;
}
