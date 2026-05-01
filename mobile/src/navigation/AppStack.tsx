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
import RemindersScreen from '../views/app/RemindersScreen';
import Sidebar from '../components/Sidebar';
import { ThemeContext } from '../store/theme';

import GoalsScreen from '../views/app/GoalsScreen';

export type AppStackParamList = {
  Tabs: undefined;
  AddTx: undefined;
  TxDetail: { tx: any };
  Categories: undefined;
  Budgets: undefined;
  Reminders: undefined;
  Recurring: undefined;
  Goals: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

function TabsWithFilter() {
  const { colors } = useContext(ThemeContext);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Tab content */}
      <View style={styles.content}>
        <AppTabs />
      </View>

      {/* ── Sidebar Overlay ── */}
      <Sidebar />
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
        name="Reminders"
        component={RemindersScreen}
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
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
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
});
