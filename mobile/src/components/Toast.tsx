import React, { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { ThemeContext } from '../store/theme';
import AppText from './AppText';
import Icon from './Icon';
import { radius, spacing, motion } from '../theme/colors';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export type ToastPayload = {
  title: string;
  message?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastCtx = {
  showToast: (t: ToastPayload) => void;
};

const ToastContext = createContext<ToastCtx>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useContext(ThemeContext);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const translateY = useRef(new Animated.Value(18)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: motion.fast, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 18, duration: motion.fast, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (t: ToastPayload) => {
      setToast(t);
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: motion.fast, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: motion.fast, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hide();
      }, t.durationMs ?? 2600);
    },
    [hide, opacity, translateY],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  const meta = (() => {
    const v = toast?.variant ?? 'info';
    if (v === 'success') return { color: colors.success, icon: 'check' as const };
    if (v === 'warning') return { color: colors.warning, icon: 'alert-triangle' as const };
    if (v === 'danger') return { color: colors.danger, icon: 'alert-triangle' as const };
    return { color: colors.accent, icon: 'info' as const };
  })();

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.host,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.accent, { backgroundColor: meta.color }]} />
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Icon name={meta.icon} size={16} color={meta.color} />
                <AppText style={{ fontWeight: '800', fontSize: 13, marginLeft: 8 }} numberOfLines={1}>
                  {toast.title}
                </AppText>
              </View>
              {toast.message ? (
                <AppText muted style={{ fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                  {toast.message}
                </AppText>
              ) : null}
            </View>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    zIndex: 9999,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
