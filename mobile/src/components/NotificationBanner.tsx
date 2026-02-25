import React, { useContext, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { NotificationsContext } from '../store/notifications';
import { colors } from '../theme/colors';

export default function NotificationBanner() {
  const { current, visible } = useContext(NotificationsContext);
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
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={1}>
          {current.title}
        </Text>
        {!!current.body && (
          <Text style={styles.body} numberOfLines={2}>
            {current.body}
          </Text>
        )}
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    color: colors.muted,
    fontSize: 12,
  },
});
