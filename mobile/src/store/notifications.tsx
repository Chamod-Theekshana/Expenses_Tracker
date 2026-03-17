import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';

export type AppNotification = {
  title: string;
  body?: string;
};

export type AppNotificationRecord = {
  id: string;
  title: string;
  body?: string;
  timestamp: Date;
  read: boolean;
};

type Ctx = {
  current: AppNotification | null;
  visible: boolean;
  history: AppNotificationRecord[];
  unreadCount: number;
  show: (n: AppNotification) => void;
  hide: () => void;
  addToHistory: (n: AppNotification) => void;
  markAllRead: () => void;
  clearHistory: () => void;
};

export const NotificationsContext = createContext<Ctx>({
  current: null,
  visible: false,
  history: [],
  unreadCount: 0,
  show: () => {},
  hide: () => {},
  addToHistory: () => {},
  markAllRead: () => {},
  clearHistory: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const [history, setHistory] = useState<AppNotificationRecord[]>([]);
  const timerRef = useRef<any>(null);

  const unreadCount = useMemo(() => history.filter((n) => !n.read).length, [history]);

  const addToHistory = useCallback((n: AppNotification) => {
    const record: AppNotificationRecord = {
      id: Math.random().toString(36).substring(2, 9),
      title: n.title,
      body: n.body,
      timestamp: new Date(),
      read: false,
    };
    setHistory((prev) => [record, ...prev]);
  }, []);

  const markAllRead = useCallback(() => {
    setHistory((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

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
      addToHistory(n);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 2500);
    },
    [addToHistory],
  );

  const value = useMemo(
    () => ({
      current,
      visible,
      history,
      unreadCount,
      show,
      hide,
      addToHistory,
      markAllRead,
      clearHistory,
    }),
    [current, visible, history, unreadCount, show, hide, addToHistory, markAllRead, clearHistory]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
