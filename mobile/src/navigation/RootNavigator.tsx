import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

import { AuthContext } from '../store/auth';
import { TransactionsContext } from '../store/transactions';
import { ProfileContext } from '../store/profile';
import { ThemeContext } from '../store/theme';

import AuthStack from './AuthStack';
import AppStack from './AppStack';
import SplashScreen from '../views/SplashScreen';
import { colors } from '../theme/colors';
import { ProfileService } from '../services/ProfileService';

import { NotificationsProvider, NotificationsContext } from '../store/notifications';
import NotificationBanner from '../components/NotificationBanner';
import { connectSocket, disconnectSocket, onEvent, offEvent } from '../services/socketService';
import { initPushForLoggedInUser, listenForegroundPush } from '../services/PushNotificationService';

function RootNavigatorInner() {
  const { userEmail, isLoading, userId } = useContext(AuthContext);
  const { fetchTransactions, clearTransactions } = useContext(TransactionsContext);
  const { loadProfile, clearProfile } = useContext(ProfileContext);
  const { setTheme } = useContext(ThemeContext);
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
        unsubscribe = listenForegroundPush((title, body) => {
          // Optional in-app banner while foreground
          show({ title, body });
        });
      } catch (e) {
        console.error('[Push] ❌ initPushForLoggedInUser FAILED:', e);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, show]);

  // ✅ Socket.IO real-time notifications (works while app is running)
  useEffect(() => {
    if (!userId || !dataLoaded) return;

    connectSocket(userId);

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

    onEvent('tx:new', onNewTx);
    onEvent('tx:deleted', onDeletedTx);
    onEvent('profile:updated', onProfileUpdated);

    return () => {
      offEvent('tx:new', onNewTx);
      offEvent('tx:deleted', onDeletedTx);
      offEvent('profile:updated', onProfileUpdated);
      disconnectSocket();
    };
  }, [userId, dataLoaded, fetchTransactions, loadProfile, setTheme, show]);

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
