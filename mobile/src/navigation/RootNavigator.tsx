import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

import { AuthContext } from '../store/auth';
import { TransactionsContext } from '../store/transactions';
import { ProfileContext } from '../store/profile';
import { ThemeContext } from '../store/theme';

import AuthStack from './AuthStack';
import AppStack from './AppStack';
import SplashScreen from '../views/SplashScreen';
import { ProfileService } from '../services/ProfileService';

import { NotificationsProvider, NotificationsContext } from '../store/notifications';
import NotificationBanner from '../components/NotificationBanner';
import { connectSocket, disconnectSocket, onEvent, offEvent } from '../services/socketService';
import { initPushForLoggedInUser, listenForegroundPush } from '../services/PushNotificationService';

function RootNavigatorInner() {
  const { userEmail, isLoading, userId, token } = useContext(AuthContext);
  const { fetchTransactions, clearTransactions } = useContext(TransactionsContext);
  const { loadProfile, clearProfile } = useContext(ProfileContext);
  const { setTheme, colors } = useContext(ThemeContext);
  const { show } = useContext(NotificationsContext);

  const [showSplash, setShowSplash] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Clear data on logout
  useEffect(() => {
    if (!userId) {
      clearProfile();
      clearTransactions();
      setDataLoaded(false);
    }
  }, [userId, clearProfile, clearTransactions]);

  // Load initial data when authenticated
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
          console.error('[RootNavigator] Failed to load initial data:', error);
        } finally {
          setDataLoaded(true);
        }
      })();
    }
  }, [userId, dataLoaded, fetchTransactions, loadProfile, setTheme]);

  // FCM Push notifications
  useEffect(() => {
    if (!userId) return;

    let unsubscribeForeground: (() => void) | undefined;

    (async () => {
      try {
        await initPushForLoggedInUser(userId);
        unsubscribeForeground = listenForegroundPush((title, body, dataType) => {
          // Show in-app banner for relevant notifications
          if (dataType !== 'test_periodic') {
            show({ title, body });
          }
        });
      } catch (e) {
        console.error('[Push] initPushForLoggedInUser failed:', e);
      }
    })();

    return () => {
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [userId, show]);

  // Socket.IO real-time events
  useEffect(() => {
    if (!userId || !dataLoaded || !token) return;

    connectSocket(token);

    const onNewTx = async (payload: any) => {
      if (payload?.title) show({ title: payload.title, body: payload.body });
      try { await fetchTransactions(userId); } catch { /* silent */ }
    };

    const onUpdatedTx = async (payload: any) => {
      if (payload?.title) show({ title: payload.title, body: payload.body });
      try { await fetchTransactions(userId); } catch { /* silent */ }
    };

    const onDeletedTx = async (payload: any) => {
      if (payload?.title) show({ title: payload.title, body: payload.body });
      try { await fetchTransactions(userId); } catch { /* silent */ }
    };

    const onProfileUpdated = async (payload: any) => {
      try {
        await loadProfile(userId);
        if (payload?.profile?.theme) setTheme(payload.profile.theme);
      } catch { /* silent */ }
    };

    const onBudgetCreated = (payload: any) => {
      show({ title: "✅ Budget Set", body: `Budget for ${payload?.budget?.category} created` });
    };
    const onBudgetUpdated = (payload: any) => {
      show({ title: "📝 Budget Updated", body: `Budget for ${payload?.budget?.category} updated` });
    };
    const onBudgetDeleted = () => {
      // silent
    };
    const onBudgetAlert = (payload: any) => {
      if (payload?.category && payload?.level) {
        const isExceeded = payload.level === 'exceeded';
        show({
          title: isExceeded ? '🚨 Budget Exceeded' : '⚠️ Budget Warning',
          body: `${payload.category} budget: ${payload.percentage}% used`,
        });
      }
    };

    const onGoalCompleted = (payload: any) => {
      if (payload?.goal?.name) {
        show({ title: '🎉 Goal Completed!', body: `You reached your "${payload.goal.name}" goal!` });
      }
    };

    onEvent('tx:new', onNewTx);
    onEvent('tx:updated', onUpdatedTx);
    onEvent('tx:deleted', onDeletedTx);
    onEvent('profile:updated', onProfileUpdated);
    onEvent('budget:created', onBudgetCreated);
    onEvent('budget:updated', onBudgetUpdated);
    onEvent('budget:deleted', onBudgetDeleted);
    onEvent('budget:alert', onBudgetAlert);
    onEvent('goal:completed', onGoalCompleted);

    return () => {
      offEvent('tx:new', onNewTx);
      offEvent('tx:updated', onUpdatedTx);
      offEvent('tx:deleted', onDeletedTx);
      offEvent('profile:updated', onProfileUpdated);
      offEvent('budget:created', onBudgetCreated);
    offEvent('budget:updated', onBudgetUpdated);
    offEvent('budget:deleted', onBudgetDeleted);
    offEvent('budget:alert', onBudgetAlert);
      offEvent('goal:completed', onGoalCompleted);
      disconnectSocket();
    };
  }, [userId, token, dataLoaded, fetchTransactions, loadProfile, setTheme, show]);

  // Hide splash screen
  useEffect(() => {
    if (!isLoading && (!userId || dataLoaded)) {
      const t = setTimeout(() => setShowSplash(false), 300);
      return () => clearTimeout(t);
    }
  }, [isLoading, userId, dataLoaded]);

  const navTheme = {
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
    <NavigationContainer theme={navTheme}>
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
