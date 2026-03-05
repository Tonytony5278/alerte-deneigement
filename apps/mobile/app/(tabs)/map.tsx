import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, useColorScheme,
} from 'react-native';
import MapView, { Marker, Callout, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, BRAND, SPACING, FONT_SIZE, RADIUS } from '@/constants/colors';
import { getNearbyStreets, type StreetResult } from '@/services/api';
import { useSettingsStore } from '@/stores/settingsStore';
import { getStatusColor } from '@/constants/colors';

const CITY_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  montreal:  { latitude: 45.5017,  longitude: -73.5673 },
  longueuil: { latitude: 45.5254,  longitude: -73.5177 },
  laval:     { latitude: 45.6066,  longitude: -73.7124 },
  quebec:    { latitude: 46.8139,  longitude: -71.2082 },
  gatineau:  { latitude: 45.4765,  longitude: -75.7013 },
};

const DEFAULT_DELTA = { latitudeDelta: 0.015, longitudeDelta: 0.015 };

export default function MapScreen() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  const { cityId } = useSettingsStore();

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [streets, setStreets] = useState<StreetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const mapRef = useRef<MapView>(null);
  const fetchTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    void init();
    return () => clearTimeout(fetchTimer.current);
  }, []);

  async function init() {
    const center = CITY_CENTERS[cityId] ?? CITY_CENTERS.montreal;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        setReady(true);
        await loadStreets(coords.latitude, coords.longitude);
        return;
      } catch {
        // fall through to city center
      }
    }
    setReady(true);
    await loadStreets(center.latitude, center.longitude);
  }

  async function loadStreets(lat: number, lng: number) {
    setLoading(true);
    try {
      const results = await getNearbyStreets(lat, lng, cityId, 600);
      setStreets(results.filter((s) => s.lat !== null && s.lng !== null).slice(0, 80));
    } catch {
      // silently ignore — map still shows
    } finally {
      setLoading(false);
    }
  }

  function handleRegionChangeComplete(r: Region) {
    clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => {
      void loadStreets(r.latitude, r.longitude);
    }, 800);
  }

  function goToMyLocation() {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion({ ...location, ...DEFAULT_DELTA }, 400);
  }

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={BRAND.primary} size="large" />
      </View>
    );
  }

  const initialRegion = {
    ...(location ?? CITY_CENTERS[cityId] ?? CITY_CENTERS.montreal),
    ...DEFAULT_DELTA,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {streets.map((street) => {
          const color = getStatusColor(street.etat ?? 0).bg;
          return (
            <Marker
              key={street.id}
              coordinate={{ latitude: street.lat!, longitude: street.lng! }}
              pinColor={color}
              tracksViewChanges={false}
            >
              <Callout onPress={() => router.push(`/street/${street.id}`)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutName} numberOfLines={2}>{street.nom_voie}</Text>
                  <Text style={styles.calloutStatus}>{street.etat_label}</Text>
                  <Text style={styles.calloutCta}>Voir le détail →</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Loading pill */}
      {loading && (
        <View style={[styles.loadingPill, { backgroundColor: C.surface }]}>
          <ActivityIndicator size="small" color={BRAND.primary} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Chargement…</Text>
        </View>
      )}

      {/* My location button */}
      {location && (
        <TouchableOpacity
          style={[styles.locateBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={goToMyLocation}
          accessibilityLabel="Ma position"
        >
          <Ionicons name="locate" size={22} color={BRAND.primary} />
        </TouchableOpacity>
      )}

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: C.surface, borderColor: C.border }]}>
        {[
          { label: 'Normal',  color: '#9CA3AF' },
          { label: 'Planifié', color: '#F97316' },
          { label: 'En cours', color: '#EF4444' },
          { label: 'Terminé',  color: '#22C55E' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendLabel, { color: C.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingPill: {
    position: 'absolute', top: 16, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  loadingText: { fontSize: FONT_SIZE.sm },
  locateBtn: {
    position: 'absolute', bottom: 100, right: 16,
    width: 48, height: 48, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  legend: {
    position: 'absolute', bottom: 100, left: 16,
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1,
    maxWidth: 200,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: FONT_SIZE.xs },
  callout: { width: 180, padding: 4 },
  calloutName: { fontWeight: '700', fontSize: 13, marginBottom: 2 },
  calloutStatus: { fontSize: 12, color: '#6B7280' },
  calloutCta: { fontSize: 12, color: '#2563EB', marginTop: 4, fontWeight: '600' },
});
