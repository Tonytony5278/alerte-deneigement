import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_SIZE, SPACING } from '@/constants/colors';

const CHECK_URL = 'https://clients3.google.com/generate_204';
const CHECK_INTERVAL = 15_000;

/**
 * Lightweight offline banner that periodically pings a known-fast endpoint.
 * No extra dependency required — works purely with fetch + AppState.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function checkConnectivity() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(CHECK_URL, {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        setIsOffline(!res.ok && res.status !== 204);
      } catch {
        setIsOffline(true);
      }
    }

    // Check on mount and periodically
    void checkConnectivity();
    interval = setInterval(checkConnectivity, CHECK_INTERVAL);

    // Also check when app returns to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkConnectivity();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name="cloud-offline-outline" size={14} color="#FFFFFF" />
      <Text style={styles.text}>Pas de connexion — donnees en cache</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
  },
  text: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
});
