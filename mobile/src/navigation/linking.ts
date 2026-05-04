import type { LinkingOptions } from '@react-navigation/native';
import type { AppStackParamList } from './AppStack';

export const appLinking: LinkingOptions<AppStackParamList> = {
  prefixes: ['pulsespend://'],
  config: {
    screens: {
      Tabs: {
        path: '',
        screens: {
          Home: 'home',
          Transactions: 'transactions',
          Charts: 'charts',
          Profile: 'profile',
        },
      },
      TxDetail: {
        path: 'transaction/:txId',
        parse: {
          txId: (id: string) => String(id),
        },
      },
      Categories: 'categories',
      Budgets: 'budgets',
      Reminders: 'reminders',
      Recurring: 'recurring',
      Goals: 'goals',
      AddTx: 'add',
    },
  },
};
