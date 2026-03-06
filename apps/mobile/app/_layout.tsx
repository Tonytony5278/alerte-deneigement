import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';

import { useWatchStore } from '@/stores/watchStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { setupNotificationChannels, addResponseListener } from '@/services/notificationService';
import { COLORS } from '@/constants/colors';
import { router } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  const initStore = useWatchStore((s) => s.init);
  const loadSettings = useSettingsStore((s) => s.load);
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);

  useEffect(() => {
    async function init() {
      await loadSettings();
      await setupNotificationChannels();
      await initStore();
      await SplashScreen.hideAsync();
    }
    void init();
  }, []);

  useEffect(() => {
    // Handle notification taps — navigate to street detail
    const sub = addResponseListener((response) => {
      const data = response.notification.request.content.data as { segmentId?: string } | undefined;
      if (data?.segmentId) {
        router.push(`/street/${data.segmentId}`);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <OfflineBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.background },
            headerTintColor: C.text,
            headerTitleStyle: { fontWeight: '700', color: C.text },
            contentStyle: { backgroundColor: C.background },
          }}
        >
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="street/[id]"
            options={{
              title: 'Détail de la rue',
              headerBackTitle: 'Retour',
            }}
          />
        </Stack>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
