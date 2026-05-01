import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

import { AuthContext } from '../store/auth';
import { TransactionsContext } from '../store/transactions';
import { ProfileContext } from '../store/profile';
import { ThemeContext } from '../store/theme';

import AuthStack from './AuthStack';
import AppStack from './AppStack';
import SplashScreen from '../views/SplashScreen';
import { ProfileService } from '../services/ProfileService';
import { promptForBiometricUnlock } from '../services/biometricAuth';

import { NotificationsProvider, NotificationsContext } from '../store/notifications';
import NotificationBanner from '../components/NotificationBanner';
import AppText from '../components/AppText';
import AppButton from '../components/AppButton';
import Icon from '../components/Icon';
import { connectSocket, disconnectSocket, onEvent, offEvent } from '../services/socketService';
import { initPushForLoggedInUser, listenForegroundPush } from '../services/PushNotificationService';

function RootNavigatorInner() {
  const { userEmail, isLoading, userId, token, signOut } = useContext(AuthContext);
  const { fetchTransactions, clearTransactions } = useContext(TransactionsContext);
  const { loadProfile, clearProfile, biometricEnabled } = useContext(ProfileContext);
  const { setTheme, colors } = useContext(ThemeContext);
  const { show } = useContext(NotificationsContext);

  const [showSplash, setShowSplash] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const appStateRef = useRef(AppState.currentState);
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLockAttemptedRef = useRef(false);

  const unlockWithBiometrics = useCallback(async () => {
    if (isUnlocking) {
      return;
    }

    setIsUnlocking(true);
    const success = await promptForBiometricUnlock('Unlock PulseSpend');
    if (success) {
      setIsAppLocked(false);
    }
    setIsUnlocking(false);
  }, [isUnlocking]);

  // Clear data on logout
  useEffect(() => {
    if (!userId) {
      clearProfile();
      clearTransactions();
      setDataLoaded(false);
    }
  }, [userId, clearProfile, clearTransactions]);

  useEffect(() => {
    if (!userId || !biometricEnabled) {
      setIsAppLocked(false);
    }
  }, [userId, biometricEnabled]);

  useEffect(() => {
    if (!userId || !biometricEnabled) {
      return;
    }

    const subscription = AppState.addEventListener('change', nextState => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      const returnedToForeground =
        (previousState === 'background' || previousState === 'inactive') && nextState === 'active';

      if (!returnedToForeground) {
        return;
      }

      setIsAppLocked(true);

      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
      }

      unlockTimeoutRef.current = setTimeout(() => {
        unlockTimeoutRef.current = null;
        unlockWithBiometrics();
      }, 220);
    });

    return () => {
      subscription.remove();
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
        unlockTimeoutRef.current = null;
      }
    };
  }, [biometricEnabled, unlockWithBiometrics, userId]);

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

  // On cold start (initial load) if biometric lock is enabled, lock the app
  useEffect(() => {
    if (!userId || !biometricEnabled || !dataLoaded) return;

    // ensure this runs only once per app process start
    if (initialLockAttemptedRef.current) return;
    initialLockAttemptedRef.current = true;

    setIsAppLocked(true);

    // give UI a short moment to render modal, then prompt biometrics
    if (unlockTimeoutRef.current) {
      clearTimeout(unlockTimeoutRef.current);
    }

    unlockTimeoutRef.current = setTimeout(() => {
      unlockTimeoutRef.current = null;
      unlockWithBiometrics();
    }, 220);

    return () => {
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
        unlockTimeoutRef.current = null;
      }
    };
  }, [userId, biometricEnabled, dataLoaded, unlockWithBiometrics]);

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

    const onReminderDue = (payload: any) => {
      if (payload?.title || payload?.body) {
        show({
          title: payload?.title || 'Bill Reminder',
          body: payload?.body || 'A bill reminder is due soon.',
        });
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
    onEvent('reminder:due', onReminderDue);

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
      offEvent('reminder:due', onReminderDue);
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

      {userEmail && biometricEnabled ? (
        <Modal visible={isAppLocked} transparent animationType="fade" onRequestClose={() => {}}>
          <View style={styles.lockOverlay}>
            <View style={[styles.lockCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <View style={[styles.lockIconWrap, { backgroundColor: colors.accent + '18' }]}>
                <Icon name="lock" size={24} color={colors.accent} />
              </View>

              <AppText style={[styles.lockTitle, { color: colors.text }]}>App Locked</AppText>
              <AppText muted style={styles.lockMessage}>
                Authenticate with biometrics to continue.
              </AppText>

              <View style={{ width: '100%', marginTop: 16 }}>
                <AppButton
                  title={isUnlocking ? 'Checking...' : 'Unlock with Biometrics'}
                  loading={isUnlocking}
                  onPress={unlockWithBiometrics}
                  disabled={isUnlocking}
                />
              </View>

              <View style={{ width: '100%', marginTop: 10 }}>
                <AppButton
                  title="Sign Out"
                  variant="secondary"
                  onPress={signOut}
                  disabled={isUnlocking}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
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

const styles = StyleSheet.create({
  lockOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lockCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  lockIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  lockMessage: {
    textAlign: 'center',
    fontSize: 13,
  },
});
