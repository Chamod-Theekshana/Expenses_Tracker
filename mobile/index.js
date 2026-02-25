/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// ✅ Background push handler (works when app is background/closed)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  try {
    // Ensure a notification channel exists (Android)
    await notifee.createChannel({
      id: 'default',
      name: 'Default',
      importance: AndroidImportance.HIGH,
    });

    const title = remoteMessage.data?.title || 'PulseSpend';
    const body = remoteMessage.data?.body || '';

    if (title || body) {
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: 'default',
          pressAction: { id: 'default' },
        },
      });
    }
  } catch (e) {
    // ignore
  }
});

AppRegistry.registerComponent(appName, () => App);
