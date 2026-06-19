/**
 * NotificationsModal
 *
 * A bottom-sheet inbox — modelled after Facebook / Instagram notifications.
 * - Fetches notification history from the backend when opened.
 * - Shows unread dot + timestamp on each item.
 * - Tap "Mark all read" or "Clear All" for bulk actions.
 * - Each item can be tapped to mark it read individually.
 */

import React, { useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AppText from './AppText';
import Icon from './Icon';
import {
  NotificationsContext,
  AppNotificationRecord,
} from '../store/notifications';
import { ThemeContext } from '../store/theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// Map notification type to an icon name used by your Icon component
const typeToIcon: Record<string, string> = {
  budget_alert:    'alert-circle',
  budget_exceeded: 'alert-circle',
  goal_completed:  'check-circle',
  reminder_due:    'clock',
  transaction:     'dollar-sign',
  recurring:       'repeat',
  test_daily:      'bell',
  general:         'bell',
};

function getIcon(type: string): string {
  return typeToIcon[type] ?? 'bell';
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsModal({ visible, onClose }: Props) {
  const {
    history,
    unreadCount,
    loading,
    fetchHistory,
    markAllRead,
    markOneRead,
    clearHistory,
  } = useContext(NotificationsContext);
  const { colors } = useContext(ThemeContext);

  // Fetch from backend whenever the modal opens
  useEffect(() => {
    if (visible) {
      fetchHistory();
    }
  }, [visible, fetchHistory]);

  // Mark all read when user opens the inbox (like Facebook)
  useEffect(() => {
    if (visible && unreadCount > 0) {
      // Small delay so the user can see the unread dots for a moment
      const t = setTimeout(() => markAllRead(), 1200);
      return () => clearTimeout(t);
    }
  }, [visible, unreadCount, markAllRead]);

  const renderItem = ({ item }: { item: AppNotificationRecord }) => (
    <Pressable
      onPress={() => markOneRead(item.id)}
      style={[
        styles.notificationItem,
        {
          borderBottomColor: colors.border,
          backgroundColor: item.read ? 'transparent' : colors.accentBg + '55',
        },
      ]}
    >
      {/* Icon circle */}
      <View style={[styles.iconWrap, { backgroundColor: colors.accentBg }]}>
        <Icon name={getIcon(item.type) as any} size={20} color={colors.accent} />
      </View>

      {/* Text content */}
      <View style={styles.contentWrap}>
        <AppText style={[styles.title, { color: colors.text }]}>
          {item.title}
        </AppText>
        {!!item.body && (
          <AppText
            style={[styles.body, { color: colors.muted }]}
            numberOfLines={2}
          >
            {item.body}
          </AppText>
        )}
        <View style={styles.footerWrap}>
          <AppText style={[styles.time, { color: colors.muted }]}>
            {formatTimeAgo(item.timestamp)}
          </AppText>
          {!item.read && (
            <View
              style={[styles.unreadDot, { backgroundColor: colors.accent }]}
            />
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Drag indicator */}
          <View
            style={[styles.dragIndicator, { backgroundColor: colors.border }]}
          />

          {/* Header */}
          <View style={styles.header}>
            <AppText style={[styles.headerTitle, { color: colors.text }]}>
              Notifications
            </AppText>
            {history.length > 0 && (
              <Pressable onPress={() => markAllRead()} hitSlop={10}>
                <AppText
                  style={[styles.headerAction, { color: colors.accent }]}
                >
                  Mark all read
                </AppText>
              </Pressable>
            )}
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : history.length > 0 ? (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                <Pressable onPress={() => clearHistory()} style={styles.clearAllBtn}>
                  <AppText
                    style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}
                  >
                    Clear All
                  </AppText>
                </Pressable>
              }
            />
          ) : (
            <View style={styles.emptyWrap}>
              <Icon name="bell" size={48} color={colors.muted} />
              <AppText style={[styles.emptyText, { color: colors.text }]}>
                No notifications yet
              </AppText>
              <AppText style={[styles.emptySubText, { color: colors.muted }]}>
                You're all caught up!
              </AppText>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    minHeight: '40%',
    paddingBottom: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  contentWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  footerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  clearAllBtn: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    marginTop: 4,
  },
});
