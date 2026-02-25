import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import { API_URL } from '../config/env';

let channelReady = false;

export async function ensureNotifChannel() {
  if (channelReady) return;
  try {
    await notifee.createChannel({
      id: 'default',
      name: 'Default',
      importance: AndroidImportance.HIGH,
    });
    channelReady = true;
    console.log('[Push] Notification channel created');
  } catch (e) {
    console.error('[Push] Failed to create notification channel:', e);
  }
}

export async function requestPushPermission(): Promise<boolean> {
  try {
    // iOS: Firebase handles the permission dialog
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const granted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      console.log('[Push] iOS permission status:', authStatus, 'granted:', granted);
      return granted;
    }

    // Android 13+ (API 33): must request POST_NOTIFICATIONS runtime permission
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      console.log('[Push] Android POST_NOTIFICATIONS permission result:', result);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    // Android < 13: permission is granted at install time
    console.log('[Push] Android < 13 — permission granted by default');
    return true;
  } catch (e) {
    console.error('[Push] Permission request failed:', e);
    return false;
  }
}

export async function getFcmToken(): Promise<string | null> {
  try {
    console.log('[Push] Requesting FCM token...');
    const token = await messaging().getToken();
    if (token) {
      console.log('[Push] FCM token obtained:', token.slice(0, 20) + '...');
    } else {
      console.warn('[Push] messaging().getToken() returned empty');
    }
    return token || null;
  } catch (e) {
    console.error('[Push] messaging().getToken() FAILED:', e);
    return null;
  }
}

export async function saveTokenToBackend(userId: string, token: string) {
  const url = `${API_URL}/api/notifications/save-token`;
  console.log('[Push] Saving token to backend:', url);
  console.log('[Push]   user_id:', userId, '  token:', token.slice(0, 20) + '...');
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, fcm_token: token }),
    });
    const data = await resp.json();
    console.log('[Push] Save token response (status', resp.status + '):', JSON.stringify(data));
  } catch (e) {
    console.error('[Push] Save token NETWORK error (is backend reachable at ' + url + '?):', e);
  }
}

export async function showLocalNotification(title: string, body: string) {
  await ensureNotifChannel();
  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: 'default',
      pressAction: { id: 'default' },
    },
  });
}

// Foreground push handling (in-app banner only — system notification is handled by App.tsx global handler)
export function listenForegroundPush(onBanner?: (title: string, body: string) => void) {
  return messaging().onMessage(async (remoteMessage) => {
    if (!onBanner) return;
    const title = (remoteMessage.data?.title as string)
      || remoteMessage.notification?.title
      || 'PulseSpend';
    const body = (remoteMessage.data?.body as string)
      || remoteMessage.notification?.body
      || '';
    if (title || body) {
      onBanner(title, body);
    }
  });
}

export async function initPushForLoggedInUser(userId: string) {
  console.log('[Push] ====== INIT PUSH START ======');
  console.log('[Push] userId:', userId);
  console.log('[Push] API_URL:', API_URL);
  console.log('[Push] Platform:', Platform.OS, 'Version:', Platform.Version);

  // Step 1: Notification channel
  await ensureNotifChannel();

  // Step 2: Permission
  const permGranted = await requestPushPermission();
  if (!permGranted) {
    console.warn('[Push] ⚠️ Notification permission NOT granted — notifications will not be visible');
  }

  // Step 3: FCM token
  const token = await getFcmToken();
  if (!token) {
    console.error('[Push] ❌ No FCM token — cannot register for push. Possible causes:');
    console.error('[Push]   - Google Play Services not available (emulator without GMS?)');
    console.error('[Push]   - Firebase not initialized (missing google-services.json?)');
    console.error('[Push]   - Network issue reaching FCM servers');
    return;
  }

  // Step 4: Save to backend
  await saveTokenToBackend(userId, token);

  // Step 5: Token refresh listener
  messaging().onTokenRefresh(async (newToken) => {
    console.log('[Push] Token refreshed, saving new token...');
    if (newToken) {
      await saveTokenToBackend(userId, newToken);
    }
  });

  console.log('[Push] ====== INIT PUSH COMPLETE ======');
}

