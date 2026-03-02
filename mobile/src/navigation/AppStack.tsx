import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import AddTransactionScreen from '../views/app/AddTransactionScreen';
import TransactionDetailScreen from '../views/app/TransactionDetailScreen';
import CategoriesScreen from '../views/app/CategoriesScreen';
import BudgetsScreen from '../views/app/BudgetsScreen';
import RecurringScreen from '../views/app/RecurringScreen';

export type AppStackParamList = {
  Tabs: undefined;
  AddTx: undefined;
  TxDetail: { tx: any };
  Categories: undefined;
  Budgets: undefined;
  Recurring: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppTabs} />
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
