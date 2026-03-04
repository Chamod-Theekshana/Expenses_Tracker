import React, { useContext } from 'react';
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
import DateFilterBar from '../components/DateFilterBar';
import { ThemeContext } from '../store/theme';
import { DateFilterContext } from '../store/dateFilter';

export type AppStackParamList = {
  Tabs: undefined;
  AddTx: undefined;
  TxDetail: { tx: any };
  Categories: undefined;
  Budgets: undefined;
  Recurring: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

function TabsWithFilter() {
  const insets = useSafeAreaInsets();
  const { colors } = useContext(ThemeContext);
  const { isOpen, setIsOpen, hasActiveFilter, filterLabel } = useContext(DateFilterContext);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Safe area spacer + DateFilterBar (collapses to 0) */}
      <View style={{ backgroundColor: colors.surface }}>
        <View style={{ height: insets.top, backgroundColor: colors.surface }} />
        <DateFilterBar />
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        <AppTabs />
      </View>

      {/* ── Floating Filter Toggle Button ── */}
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={[
          styles.filterFab,
          {
            top: insets.top + 6,
            backgroundColor: isOpen ? colors.accent : colors.surface,
            borderColor: isOpen ? colors.accent : colors.border,
            shadowColor: colors.accent,
          },
        ]}
      >
        <Icon name="calendar" size={18} color={isOpen ? '#FFF' : colors.muted} />
        {hasActiveFilter && !isOpen && (
          <View style={[styles.fabDot, { backgroundColor: colors.accent }]} />
        )}
      </Pressable>
    </View>
  );
}

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabsWithFilter} />
      <Stack.Screen
        name="AddTx"
        component={AddTransactionScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="TxDetail"
        component={TransactionDetailScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Recurring"
        component={RecurringScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  filterFab: {
    position: 'absolute',
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 100,
  },
  fabDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
