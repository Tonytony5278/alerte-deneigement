import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('deneigement', {
      name: 'Alertes déneigement',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F97316',
    });

    await Notifications.setNotificationChannelAsync('deneigement-urgent', {
      name: 'Urgences déneigement',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#EF4444',
    });
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    // Simulator / emulator — permissions don't work as expected
    return true;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const hasPermission = await requestPermissions();
  if (!hasPermission) return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });
    return tokenData.data;
  } catch (err) {
    console.warn('Failed to get push token:', err);
    return null;
  }
}

export type NotificationData = {
  segmentId?: string;
  type?: 'status_change' | 't60' | 't30' | 'in_progress' | 'storm_alert';
  etat?: number;
};

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function removeListener(subscription: Notifications.Subscription): void {
  subscription.remove();
}
