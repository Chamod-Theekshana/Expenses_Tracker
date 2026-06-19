/**
 * AppStack
 *
 * The root authenticated navigator.  The "Tabs" screen now has a floating
 * notification bell in the top-right corner — exactly like Facebook /
 * Instagram — that shows an unread badge and opens the notification inbox
 * (NotificationsModal) when tapped.
 */

import React, { useContext, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppTabs from './AppTabs';
import AddTransactionScreen from '../views/app/AddTransactionScreen';
import TransactionDetailScreen from '../views/app/TransactionDetailScreen';
import CategoriesScreen from '../views/app/CategoriesScreen';
import BudgetsScreen from '../views/app/BudgetsScreen';
import RecurringScreen from '../views/app/RecurringScreen';
import RemindersScreen from '../views/app/RemindersScreen';
import ChangeThemeScreen from '../views/app/ChangeThemeScreen';
import DefaultCurrencyScreen from '../views/app/DefaultCurrencyScreen';
import DateFormatScreen from '../views/app/DateFormatScreen';
import Sidebar from '../components/Sidebar';
import { ThemeContext } from '../store/theme';
import { NotificationsContext } from '../store/notifications';
import NotificationsModal from '../components/NotificationsModal';
import AppText from '../components/AppText';

import GoalsScreen from '../views/app/GoalsScreen';
import type { Tx } from '../store/transactions';

export type AppStackParamList = {
  Tabs: undefined;
  AddTx: undefined;
  TxDetail: { tx?: Tx; txId?: string };
  Categories: undefined;
  Budgets: undefined;
  Reminders: undefined;
  Recurring: undefined;
  Goals: undefined;
  ChangeTheme: undefined;
  DefaultCurrency: undefined;
  DateFormat: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

// ── Notification Bell ─────────────────────────────────────────────────────────
// Rendered as a floating button in the top-right corner of the main tab view.
// Badge shows the unread count, just like Facebook / Instagram.

function NotificationBell({ onPress }: { onPress: () => void }) {
  const { colors } = useContext(ThemeContext);
  const { unreadCount } = useContext(NotificationsContext);
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.bellButton,
        {
          top: insets.top + 10,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: '#000',
        },
      ]}
      hitSlop={12}
    >
      <Icon name="bell" size={22} color={colors.text} strokeWidth={2} />

      {/* Unread badge — visible only when unreadCount > 0 */}
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <AppText style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : String(unreadCount)}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

// ── TabsWithFilter ────────────────────────────────────────────────────────────

function TabsWithFilter() {
  const { colors } = useContext(ThemeContext);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleBellPress = () => {
    setShowNotifications(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Main tab content */}
      <View style={styles.content}>
        <AppTabs />
      </View>

      {/* Sidebar Overlay */}
      <Sidebar />

      {/* ── Facebook / Instagram-style notification bell ── */}
      {/* <NotificationBell onPress={handleBellPress} /> */}

      {/* ── Notification Inbox Modal ── */}
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
  );
}

// ── AppStack ──────────────────────────────────────────────────────────────────

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabsWithFilter} />
      <Stack.Screen
        name="AddTx"
        component={AddTransactionScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="TxDetail"
        component={TransactionDetailScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Recurring"
        component={RecurringScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ChangeTheme"
        component={ChangeThemeScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="DefaultCurrency"
        component={DefaultCurrencyScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="DateFormat"
        component={DateFormatScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },

  // Floating bell button — top-right, above everything except modals
  bellButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },

  // Red badge (like Facebook)
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 14,
  },
});
