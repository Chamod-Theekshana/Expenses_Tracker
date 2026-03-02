import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

import { AuthContext } from '../store/auth';
import { TransactionsContext } from '../store/transactions';
import { ProfileContext } from '../store/profile';
import { ThemeContext } from '../store/theme';

import AuthStack from './AuthStack';
import AppStack from './AppStack';
import SplashScreen from '../views/SplashScreen';
// colors imported below via ThemeContext
import { ProfileService } from '../services/ProfileService';

import { NotificationsProvider, NotificationsContext } from '../store/notifications';
import NotificationBanner from '../components/NotificationBanner';
import { connectSocket, disconnectSocket, onEvent, offEvent } from '../services/socketService';
import { initPushForLoggedInUser, listenForegroundPush, showLocalNotification } from '../services/PushNotificationService';
import { API_URL } from '../config/env';
import { apiFetch } from '../services/http';

function RootNavigatorInner() {
  const { userEmail, isLoading, userId, token } = useContext(AuthContext);
  const { fetchTransactions, clearTransactions } = useContext(TransactionsContext);
  const { loadProfile, clearProfile } = useContext(ProfileContext);
  const { setTheme, colors } = useContext(ThemeContext);
  const { show } = useContext(NotificationsContext);

  const [showSplash, setShowSplash] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Clear data when user logs out
  useEffect(() => {
    if (!userId) {
      clearProfile();
      clearTransactions();
      setDataLoaded(false);
    }
  }, [userId, clearProfile, clearTransactions]);

  // Load data when user is authenticated
  useEffect(() => {
    if (userId && !dataLoaded) {
      (async () => {
        try {
          const [profileData] = await Promise.all([
            ProfileService.getProfile(userId),
            fetchTransactions(userId),
          ]);
          await loadProfile(userId);
          if (profileData?.theme) setTheme(profileData.theme);
        } catch (error) {
          console.error('Failed to load initial data:', error);
        } finally {
          setDataLoaded(true);
        }
      })();
    }
  }, [userId, dataLoaded, fetchTransactions, loadProfile, setTheme]);

  // ✅ FCM Push notifications (works even when app is closed/background)
  useEffect(() => {
    if (!userId) return;

    let unsubscribe: any;

    (async () => {
      try {
        await initPushForLoggedInUser(userId);
        unsubscribe = listenForegroundPush((title, body, dataType) => {
          // Skip in-app banner for test notifications (they show as system push only)
          if (dataType === 'test_periodic') return;
          // Optional in-app banner while foreground
          show({ title, body });
        });

        // Start periodic test notifications (every 60s) from backend
        try {
          await apiFetch(`/api/notifications/start-test`, { method: 'POST' });
          console.log('[Push] Test notifications started for user:', userId);
        } catch (e) {
          console.error('[Push] Failed to start test notifications:', e);
        }
      } catch (e) {
        console.error('[Push] ❌ initPushForLoggedInUser FAILED:', e);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
      // Stop periodic test notifications on logout/unmount
      apiFetch(`/api/notifications/stop-test`, { method: 'POST' }).catch((e) =>
        console.error('[Push] Failed to stop test notifications:', e),
      );
    };
  }, [userId, show]);

  // ✅ Socket.IO real-time notifications (works while app is running)
  useEffect(() => {
    if (!userId || !dataLoaded || !token) return;

    connectSocket(token);

    const onNewTx = async (payload: any) => {
      if (payload?.title) show({ title: payload.title, body: payload.body });
      try {
        await fetchTransactions(userId);
      } catch { }
    };

    const onDeletedTx = async (payload: any) => {
      if (payload?.title) show({ title: payload.title, body: payload.body });
      try {
        await fetchTransactions(userId);
      } catch { }
    };

    const onProfileUpdated = async (payload: any) => {
      // If backend sends profile -> update local store
      try {
        await loadProfile(userId);
        if (payload?.profile?.theme) setTheme(payload.profile.theme);
      } catch { }
    };

    const onRecurringCreated = (payload: any) => {
      const title = payload?.title || '🔄 Recurring Added';
      const body = payload?.body || '';
      show({ title, body });
    };

    const onRecurringDeleted = (payload: any) => {
      const title = payload?.title || '🗑️ Recurring Removed';
      const body = payload?.body || '';
      show({ title, body });
    };

    onEvent('tx:new', onNewTx);
    onEvent('tx:deleted', onDeletedTx);
    onEvent('profile:updated', onProfileUpdated);
    onEvent('recurring:created', onRecurringCreated);
    onEvent('recurring:deleted', onRecurringDeleted);

    return () => {
      offEvent('tx:new', onNewTx);
      offEvent('tx:deleted', onDeletedTx);
      offEvent('profile:updated', onProfileUpdated);
      offEvent('recurring:created', onRecurringCreated);
      offEvent('recurring:deleted', onRecurringDeleted);
      disconnectSocket();
    };
  }, [userId, token, dataLoaded, fetchTransactions, loadProfile, setTheme, show]);

  // Hide splash when auth loaded and data fetched (or no user)
  useEffect(() => {
    if (!isLoading && (!userId || dataLoaded)) {
      const t = setTimeout(() => setShowSplash(false), 300);
      return () => clearTimeout(t);
    }
  }, [isLoading, userId, dataLoaded]);

  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };

  if (isLoading || showSplash || (userId && !dataLoaded)) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={theme}>
      <NotificationBanner />
      {userEmail ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function RootNavigator() {
  return (
    <NotificationsProvider>
      <RootNavigatorInner />
    </NotificationsProvider>
  );
}
