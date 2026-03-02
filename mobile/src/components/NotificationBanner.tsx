import React, { useContext, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { NotificationsContext } from '../store/notifications';
import { ThemeContext } from '../store/theme';

export default function NotificationBanner() {
  const { current, visible } = useContext(NotificationsContext);
  const { colors } = useContext(ThemeContext);
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -80,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  if (!current) return null;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }] }]} pointerEvents="none">
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {current.title}
          </Text>
          {!!current.body && (
            <Text style={[styles.body, { color: colors.muted }]} numberOfLines={2}>
              {current.body}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
  },
});
