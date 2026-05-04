import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './http';

const STORAGE_KEY = '@pulsespend_offline_outbox_v1';

export type CreateTxOutboxEntry = {
  kind: 'createTx';
  body: string;
  createdAt: number;
};

export async function enqueueCreateTxBody(body: string): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const list: CreateTxOutboxEntry[] = raw ? JSON.parse(raw) : [];
  list.push({ kind: 'createTx', body, createdAt: Date.now() });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function flushOfflineOutbox(): Promise<{ flushed: number; remaining: number }> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { flushed: 0, remaining: 0 };

  let list: CreateTxOutboxEntry[] = JSON.parse(raw);
  const remaining: CreateTxOutboxEntry[] = [];
  let flushed = 0;

  for (const entry of list) {
    if (entry.kind !== 'createTx') {
      remaining.push(entry);
      continue;
    }
    try {
      await apiFetch('/api/transaction', {
        method: 'POST',
        body: entry.body,
        headers: { 'Content-Type': 'application/json' },
      });
      flushed += 1;
    } catch {
      remaining.push(entry);
    }
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return { flushed, remaining: remaining.length };
}
