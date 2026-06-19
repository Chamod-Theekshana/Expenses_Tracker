/**
 * NotificationApiService
 *
 * Communicates with the backend notification inbox endpoints:
 *   GET  /api/notifications/history          — fetch inbox
 *   PATCH /api/notifications/mark-all-read   — mark all read
 *   PATCH /api/notifications/:id/read        — mark one read
 *   DELETE /api/notifications/clear          — wipe inbox
 *
 * Used by the notifications store so the inbox persists across
 * app restarts — exactly like Facebook / Instagram.
 */

import { apiFetch } from './http';

export type BackendNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string; // ISO string
};

export type HistoryResponse = {
  notifications: BackendNotification[];
  unreadCount: number;
};

export const NotificationApiService = {
  /** Fetch the user's notification inbox (newest first). */
  async getHistory(limit = 50, offset = 0): Promise<HistoryResponse> {
    return apiFetch<HistoryResponse>(
      `/api/notifications/history?limit=${limit}&offset=${offset}`
    );
  },

  /** Mark every notification as read (call when user opens the bell modal). */
  async markAllRead(): Promise<void> {
    await apiFetch('/api/notifications/mark-all-read', { method: 'PATCH' });
  },

  /** Mark a single notification as read. */
  async markOneRead(id: string): Promise<void> {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  /** Delete all notifications for this user. */
  async clear(): Promise<void> {
    await apiFetch('/api/notifications/clear', { method: 'DELETE' });
  },
};
