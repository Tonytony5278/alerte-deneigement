import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, SafeAreaView, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';

import { COLORS, SPACING, RADIUS, FONT_SIZE, BRAND } from '@/constants/colors';
import { getIncentiveParking, type ParkingSpot } from '@/services/api';

export default function ParkingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    })();
  }, []);

  const { data: spots, isLoading, error, refetch } = useQuery({
    queryKey: ['parking', userLocation?.lat, userLocation?.lng],
    queryFn: () =>
      getIncentiveParking(userLocation?.lat, userLocation?.lng, 5000),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  function openMaps(spot: ParkingSpot) {
    const url = `maps://app?daddr=${spot.lat},${spot.lng}`;
    const fallback = `https://maps.google.com/?q=${spot.lat},${spot.lng}`;
    Linking.openURL(url).catch(() => Linking.openURL(fallback));
  }

  function formatDistance(m?: number): string {
    if (!m) return '';
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <FlatList
        data={spots ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: C.text }]}>Stationnements incitatifs</Text>
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>
              Gratuits pendant les opérations de déneigement
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={BRAND.primary} size="large" />
              <Text style={[styles.loadingText, { color: C.textSecondary }]}>Chargement...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={40} color={C.textMuted} />
              <Text style={[styles.errorText, { color: C.textSecondary }]}>
                Impossible de charger les stationnements
              </Text>
              <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { borderColor: C.border }]}>
                <Text style={{ color: C.text }}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="car-outline" size={40} color={C.textMuted} />
              <Text style={[styles.errorText, { color: C.textSecondary }]}>
                Aucun stationnement incitatif trouvé à proximité
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="car" size={20} color={BRAND.primary} />
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: C.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.cardAddress, { color: C.textSecondary }]} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
              {item.distanceM !== undefined && (
                <Text style={[styles.distance, { color: BRAND.primary }]}>
                  {formatDistance(item.distanceM)}
                </Text>
              )}
            </View>
            {item.capacity && (
              <Text style={[styles.capacity, { color: C.textMuted }]}>
                ~{item.capacity} places
              </Text>
            )}
            {item.notes && (
              <Text style={[styles.notes, { color: C.textSecondary }]}>
                {item.notes}
              </Text>
            )}
            <TouchableOpacity
              onPress={() => openMaps(item)}
              style={[styles.itineraireBtn, { backgroundColor: BRAND.primary }]}
              accessibilityRole="button"
              accessibilityLabel={`Itinéraire vers ${item.name}`}
            >
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.itineraireBtnText}>Itinéraire</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: SPACING.md, paddingBottom: SPACING['2xl'] },
  header: { marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: FONT_SIZE.sm },
  card: {
    borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: SPACING.xs },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FONT_SIZE.base, fontWeight: '600', marginBottom: 2 },
  cardAddress: { fontSize: FONT_SIZE.sm },
  distance: { fontSize: FONT_SIZE.sm, fontWeight: '700', flexShrink: 0 },
  capacity: { fontSize: FONT_SIZE.xs, marginBottom: 4 },
  notes: { fontSize: FONT_SIZE.xs, fontStyle: 'italic', marginBottom: SPACING.sm },
  itineraireBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: RADIUS.md, marginTop: SPACING.xs,
  },
  itineraireBtnText: { color: '#fff', fontWeight: '600', fontSize: FONT_SIZE.sm },
  center: { alignItems: 'center', paddingVertical: SPACING.xl },
  loadingText: { fontSize: FONT_SIZE.sm, marginTop: SPACING.sm },
  errorText: { fontSize: FONT_SIZE.sm, textAlign: 'center', marginTop: SPACING.sm },
  retryBtn: {
    marginTop: SPACING.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1,
  },
});
