import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/store/auth';
import { TransactionsProvider } from './src/store/transactions';
import { ThemeProvider } from './src/store/theme';
import { ProfileProvider } from './src/store/profile';
import { colors } from './src/theme/colors';
import { requestPushPermission, ensureNotifChannel, showLocalNotification } from './src/services/PushNotificationService';

export default function App() {
  // Request notification permission on app open (before login)
  useEffect(() => {
    (async () => {
      try {
        await ensureNotifChannel();
        await requestPushPermission();
      } catch (e) {
        console.warn('[Push] Early permission request failed:', e);
      }
    })();
  }, []);

  // Global foreground push handler — catches pushes even before sign-in
  // (e.g. the welcome push sent during account creation)
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('[Push] Global foreground message received:', JSON.stringify(remoteMessage.data));
      const title = (remoteMessage.data?.title as string)
        || remoteMessage.notification?.title
        || 'PulseSpend';
      const body = (remoteMessage.data?.body as string)
        || remoteMessage.notification?.body
        || '';
      if (title || body) {
        await showLocalNotification(title, body);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <AuthProvider>
          <ProfileProvider>
            <TransactionsProvider>
              <RootNavigator />
            </TransactionsProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

