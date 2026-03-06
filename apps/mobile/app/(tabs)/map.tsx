import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, useColorScheme,
} from 'react-native';
import MapView, { Marker, Polyline, Callout, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, BRAND, SPACING, FONT_SIZE, RADIUS } from '@/constants/colors';
import { getMapSegments, type MapSegment } from '@/services/api';
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

// Status colors for polylines (more vibrant for visibility on map)
const POLYLINE_COLORS: Record<number, string> = {
  0: '#9CA3AF', // Unknown — grey
  1: '#9CA3AF', // Normal — grey
  2: '#F97316', // Scheduled — orange
  3: '#EF4444', // In progress — red
  4: '#22C55E', // Completed — green
  5: '#EAB308', // Restricted — yellow
};

function getPolylineColor(etat: number): string {
  return POLYLINE_COLORS[etat] ?? '#9CA3AF';
}

// Convert [[lng, lat], ...] → [{latitude, longitude}, ...]
function toLatLngs(geometry: number[][]): Array<{ latitude: number; longitude: number }> {
  return geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export default function MapScreen() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  const { cityId } = useSettingsStore();

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [segments, setSegments] = useState<MapSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [segmentCount, setSegmentCount] = useState(0);

  const mapRef = useRef<MapView>(null);
  const fetchTimer = useRef<ReturnType<typeof setTimeout>>();
  const currentRegion = useRef<Region | null>(null);

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
        const initialRegion = { ...coords, ...DEFAULT_DELTA };
        currentRegion.current = initialRegion;
        await loadSegments(initialRegion);
        return;
      } catch {
        // fall through to city center
      }
    }
    setReady(true);
    const fallbackRegion = { ...center, ...DEFAULT_DELTA };
    currentRegion.current = fallbackRegion;
    await loadSegments(fallbackRegion);
  }

  async function loadSegments(region: Region) {
    setLoading(true);
    try {
      const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
      const minLat = latitude - latitudeDelta / 2;
      const maxLat = latitude + latitudeDelta / 2;
      const minLng = longitude - longitudeDelta / 2;
      const maxLng = longitude + longitudeDelta / 2;

      const data = await getMapSegments(minLat, maxLat, minLng, maxLng, cityId, 2000);
      setSegments(data);
      setSegmentCount(data.length);
    } catch {
      // silently ignore — map still shows
    } finally {
      setLoading(false);
    }
  }

  const handleRegionChangeComplete = useCallback((r: Region) => {
    currentRegion.current = r;
    clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => {
      void loadSegments(r);
    }, 600);
  }, [cityId]);

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

  // Split segments into polylines (have geometry) and markers (point only)
  const polylineSegments = segments.filter((s) => s.geometry && s.geometry.length >= 2);
  const markerSegments = segments.filter((s) => !s.geometry || s.geometry.length < 2);

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
        {/* Polyline segments (streets with geometry) */}
        {polylineSegments.map((seg) => (
          <Polyline
            key={seg.id}
            coordinates={toLatLngs(seg.geometry!)}
            strokeColor={getPolylineColor(seg.etat)}
            strokeWidth={4}
            tappable
            onPress={() => router.push(`/street/${seg.id}`)}
          />
        ))}

        {/* Marker fallback for segments without geometry */}
        {markerSegments.map((seg) => {
          const color = getStatusColor(seg.etat).bg;
          return (
            <Marker
              key={seg.id}
              coordinate={{ latitude: seg.lat, longitude: seg.lng }}
              pinColor={color}
              tracksViewChanges={false}
            >
              <Callout onPress={() => router.push(`/street/${seg.id}`)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutName} numberOfLines={2}>{seg.nom_voie}</Text>
                  <Text style={styles.calloutStatus}>{seg.etat_label}</Text>
                  <Text style={styles.calloutCta}>Voir le detail</Text>
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
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Chargement...</Text>
        </View>
      )}

      {/* Segment count badge */}
      {!loading && segmentCount > 0 && (
        <View style={[styles.countPill, { backgroundColor: C.surface }]}>
          <Text style={[styles.countText, { color: C.textSecondary }]}>
            {segmentCount} segment{segmentCount > 1 ? 's' : ''}
          </Text>
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
          { label: 'Normal',   color: '#9CA3AF' },
          { label: 'Planifie', color: '#F97316' },
          { label: 'En cours', color: '#EF4444' },
          { label: 'Termine',  color: '#22C55E' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: item.color }]} />
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
  countPill: {
    position: 'absolute', top: 16, alignSelf: 'center',
    paddingHorizontal: SPACING.sm + 2, paddingVertical: 4,
    borderRadius: RADIUS.full,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  countText: { fontSize: FONT_SIZE.xs },
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
    maxWidth: 220,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 16, height: 4, borderRadius: 2 },
  legendLabel: { fontSize: FONT_SIZE.xs },
  callout: { width: 180, padding: 4 },
  calloutName: { fontWeight: '700', fontSize: 13, marginBottom: 2 },
  calloutStatus: { fontSize: 12, color: '#6B7280' },
  calloutCta: { fontSize: 12, color: '#2563EB', marginTop: 4, fontWeight: '600' },
});
