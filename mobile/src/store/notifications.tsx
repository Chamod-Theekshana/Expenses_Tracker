import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';

export type AppNotification = {
  title: string;
  body?: string;
};

type Ctx = {
  current: AppNotification | null;
  visible: boolean;
  show: (n: AppNotification) => void;
  hide: () => void;
};

export const NotificationsContext = createContext<Ctx>({
  current: null,
  visible: false,
  show: () => {},
  hide: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<any>(null);

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
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 2500);
    },
    [],
  );

  const value = useMemo(() => ({ current, visible, show, hide }), [current, visible, show, hide]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
