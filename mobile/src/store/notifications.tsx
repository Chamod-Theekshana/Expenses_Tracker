/**
 * Notifications Store
 *
 * Manages two things:
 *  1. The transient in-app banner (slide-down like iOS system banner)
 *  2. The persistent notification inbox — fetched from the backend so it
 *     survives app restarts, exactly like Facebook / Instagram.
 *
 * The `history` array always mirrors what is in the backend DB.
 * `unreadCount` is derived from the backend's authoritative count.
 */

import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { NotificationApiService, BackendNotification } from '../services/NotificationApiService';

// ── Types ────────────────────────────────────────────────────────────────────

export type AppNotification = {
  title: string;
  body?: string;
};

/** A notification record as stored in the DB and displayed in the inbox. */
export type AppNotificationRecord = {
  id: string;
  title: string;
  body?: string;
  type: string;
  timestamp: Date;
  read: boolean;
};

type Ctx = {
  // Banner
  current: AppNotification | null;
  visible: boolean;
  show: (n: AppNotification) => void;
  hide: () => void;

  // Inbox
  history: AppNotificationRecord[];
  unreadCount: number;
  loading: boolean;

  // Actions
  fetchHistory: () => Promise<void>;
  addToHistory: (n: AppNotification) => void;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
};

// ── Context ──────────────────────────────────────────────────────────────────

export const NotificationsContext = createContext<Ctx>({
  current: null,
  visible: false,
  show: () => {},
  hide: () => {},
  history: [],
  unreadCount: 0,
  loading: false,
  fetchHistory: async () => {},
  addToHistory: () => {},
  markAllRead: async () => {},
  markOneRead: async () => {},
  clearHistory: async () => {},
});

// ── Provider ─────────────────────────────────────────────────────────────────

function mapBackend(n: BackendNotification): AppNotificationRecord {
  return {
    id: String(n.id),
    title: n.title,
    body: n.body || undefined,
    type: n.type ?? 'general',
    timestamp: new Date(n.created_at),
    read: n.read,
  };
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  // Banner state
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const [visible, setVisible]  = useState(false);
  const timerRef               = useRef<any>(null);

  // Inbox state
  const [history, setHistory]         = useState<AppNotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);

  // ── Banner ────────────────────────────────────────────────────────────────

  const hide = useCallback(() => {
    setVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (n: AppNotification) => {
      setCurrent(n);
      setVisible(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 2500);
    },
    []
  );

  // ── Inbox: fetch from backend ─────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const result = await NotificationApiService.getHistory();
      setHistory(result.notifications.map(mapBackend));
      setUnreadCount(result.unreadCount);
    } catch (err) {
      console.warn('[NotificationsStore] fetchHistory failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimistically add a new notification to the top of the list when a
  // foreground push or socket event arrives (before next fetchHistory call).
  const addToHistory = useCallback((n: AppNotification) => {
    const record: AppNotificationRecord = {
      id: Math.random().toString(36).substring(2, 9),
      title: n.title,
      body: n.body,
      type: 'general',
      timestamp: new Date(),
      read: false,
    };
    setHistory((prev) => [record, ...prev]);
    setUnreadCount((c) => c + 1);
  }, []);

  // ── Inbox: mutations ──────────────────────────────────────────────────────

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setHistory((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await NotificationApiService.markAllRead();
    } catch (err) {
      console.warn('[NotificationsStore] markAllRead failed:', err);
      // Re-fetch to restore truth
      await fetchHistory();
    }
  }, [fetchHistory]);

  const markOneRead = useCallback(
    async (id: string) => {
      setHistory((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await NotificationApiService.markOneRead(id);
      } catch (err) {
        console.warn('[NotificationsStore] markOneRead failed:', err);
      }
    },
    []
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    setUnreadCount(0);
    try {
      await NotificationApiService.clear();
    } catch (err) {
      console.warn('[NotificationsStore] clear failed:', err);
    }
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      current,
      visible,
      show,
      hide,
      history,
      unreadCount,
      loading,
      fetchHistory,
      addToHistory,
      markAllRead,
      markOneRead,
      clearHistory,
    }),
    [
      current, visible, show, hide,
      history, unreadCount, loading,
      fetchHistory, addToHistory,
      markAllRead, markOneRead, clearHistory,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
