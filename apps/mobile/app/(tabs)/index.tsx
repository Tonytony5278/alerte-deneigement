import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, useColorScheme, SafeAreaView, ActivityIndicator, Alert,
  Keyboard, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { COLORS, SPACING, RADIUS, FONT_SIZE, BRAND } from '@/constants/colors';
import { FALLBACK_CITIES } from '@/constants/cities';
import { useWatchStore } from '@/stores/watchStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { searchStreets, getNearbyStreets, getCities, type StreetResult, type CityConfig } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { StreetCard } from '@/components/StreetCard';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { CityPicker } from '@/components/CityPicker';

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  const params = useLocalSearchParams();

  const { watches, addWatch, removeWatch, isLoading: watchLoading, error: watchError, clearError } = useWatchStore();
  const { onboardingDone, cityId, update: updateSettings } = useSettingsStore();

  const { data: citiesData } = useQuery<CityConfig[]>({
    queryKey: ['cities'],
    queryFn: getCities,
    staleTime: 24 * 60 * 60 * 1000, // 24h
  });
  const cities = citiesData ?? FALLBACK_CITIES;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StreetResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isParkedMode, setIsParkedMode] = useState(false);
  const [nearbyStreets, setNearbyStreets] = useState<StreetResult[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Redirect to onboarding if not done
  useEffect(() => {
    if (!onboardingDone) {
      router.replace('/onboarding');
    }
  }, [onboardingDone]);

  // Handle "Je suis stationné ici" from onboarding param
  useEffect(() => {
    if (params.action === 'parked') {
      void handleParkedHere();
    }
  }, [params.action]);

  // Show watch errors
  useEffect(() => {
    if (watchError) {
      Alert.alert('Erreur', watchError, [{ text: 'OK', onPress: clearError }]);
    }
  }, [watchError]);

  async function handleParkedHere() {
    setIsParkedMode(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Localisation requise',
          'Active la localisation pour utiliser ce mode.',
          [{ text: 'OK' }]
        );
        setIsParkedMode(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      setLocation({ lat: latitude, lng: longitude });

      const streets = await getNearbyStreets(latitude, longitude, cityId, 200);
      setNearbyStreets(streets.slice(0, 3));

      if (streets.length === 1) {
        // Auto-confirm if single match
        await confirmParked(streets[0]);
      }
    } catch (err) {
      console.warn('Location error:', err);
      setIsParkedMode(false);
    }
  }

  async function confirmParked(street: StreetResult) {
    setIsParkedMode(false);
    setNearbyStreets([]);
    try {
      await addWatch(street, street.nom_voie);
    } catch (err) {
      // Error shown via watchError effect
    }
  }

  function handleSearch(text: string) {
    setSearchQuery(text);
    clearTimeout(searchTimer.current);
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchStreets(text, cityId, 8);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function handleSelectStreet(street: StreetResult) {
    setSearchQuery('');
    setSearchResults([]);
    router.push(`/street/${street.id}`);
  }

  const [refreshing, setRefreshing] = useState(false);
  const { loadWatches } = useWatchStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadWatches();
    } finally {
      setRefreshing(false);
    }
  }, [loadWatches]);

  const activeWatch = watches[0]; // Primary vehicle watch
  const favoriteWatches = watches.slice(1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />
        }
      >
        {/* Search bar */}
        <View style={[styles.searchContainer, { backgroundColor: C.surfaceElevated, borderColor: C.border }]}>
          <Ionicons name="search" size={18} color={C.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Chercher une adresse..."
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Chercher une adresse"
          />
          {searching && <ActivityIndicator size="small" color={C.icon} />}
        </View>

        {/* City picker */}
        <View style={styles.cityRow}>
          <CityPicker
            cities={cities}
            selectedCityId={cityId}
            onSelect={(id) => updateSettings({ cityId: id })}
          />
        </View>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <View style={[styles.searchDropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                onPress={() => handleSelectStreet(result)}
                style={[styles.searchResultItem, { borderBottomColor: C.border }]}
                activeOpacity={0.7}
              >
                <View style={styles.searchResultLeft}>
                  <Ionicons name="location-outline" size={16} color={C.icon} />
                  <Text style={[styles.searchResultText, { color: C.text }]} numberOfLines={1}>
                    {result.nom_voie}
                    {result.debut_adresse ? ` (${result.debut_adresse}–${result.fin_adresse})` : ''}
                  </Text>
                </View>
                <StatusBadge etat={result.etat ?? null} size="sm" showIcon={false} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Nearby streets picker (parked mode) */}
        {isParkedMode && nearbyStreets.length > 0 && (
          <View style={[styles.nearbyContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Confirme ta rue</Text>
            {nearbyStreets.map((street) => (
              <TouchableOpacity
                key={street.id}
                onPress={() => confirmParked(street)}
                style={[styles.nearbyItem, { borderColor: C.border }]}
                activeOpacity={0.8}
              >
                <Ionicons name="location" size={16} color={BRAND.primary} />
                <Text style={[styles.nearbyText, { color: C.text }]}>
                  {street.nom_voie}
                  {street.cote ? ` · côté ${street.cote}` : ''}
                </Text>
                <StatusBadge etat={street.etat ?? null} size="sm" showIcon={false} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => { setIsParkedMode(false); setNearbyStreets([]); }}
              style={styles.cancelParkedBtn}
            >
              <Text style={{ color: C.textSecondary, fontSize: FONT_SIZE.sm }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading parked mode */}
        {isParkedMode && nearbyStreets.length === 0 && (
          <View style={styles.loadingParked}>
            <ActivityIndicator color={BRAND.primary} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>Recherche de ta rue...</Text>
          </View>
        )}

        {/* Disclaimer */}
        <DisclaimerBanner />

        {/* Empty state + "Je suis stationné ici" CTA */}
        {watches.length === 0 && !isParkedMode && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: BRAND.secondary }]}>
              <Ionicons name="snow" size={40} color={BRAND.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.text }]}>
              Surveille ta rue
            </Text>
            <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
              Cherche ton adresse ou localise-toi pour recevoir des alertes de déneigement.
            </Text>
            <TouchableOpacity
              onPress={handleParkedHere}
              style={[styles.parkedCta, { backgroundColor: BRAND.primary }]}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Ionicons name="car" size={22} color="#fff" />
              <Text style={styles.parkedCtaText}>Je suis stationné ici</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active watch — Mon véhicule */}
        {activeWatch && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Mon véhicule</Text>
            <StreetCard
              watch={activeWatch}
              onPress={() => router.push(`/street/${activeWatch.segment_id}`)}
              onPressDeplacer={async () => {
                Alert.alert(
                  'Déplacer mon auto',
                  'Arrêter la surveillance de cette rue ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Oui', onPress: () => removeWatch(activeWatch.id) },
                  ]
                );
              }}
            />
          </View>
        )}

        {/* Favoris */}
        {favoriteWatches.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Favoris</Text>
            {favoriteWatches.map((watch) => (
              <StreetCard
                key={watch.id}
                watch={watch}
                onPress={() => router.push(`/street/${watch.segment_id}`)}
              />
            ))}
          </View>
        )}

        {/* Quick link to parking */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/parking')}
          style={[styles.parkingLink, { backgroundColor: C.surfaceElevated, borderColor: C.border }]}
          activeOpacity={0.8}
        >
          <Ionicons name="car" size={18} color={BRAND.primary} />
          <Text style={[styles.parkingLinkText, { color: C.text }]}>
            Trouver un stationnement incitatif gratuit
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.icon} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING['2xl'] },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: FONT_SIZE.base, height: 36 },
  searchDropdown: {
    borderRadius: RADIUS.md, borderWidth: 1,
    marginBottom: SPACING.sm, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
  },
  searchResultLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  searchResultText: { fontSize: FONT_SIZE.sm, flex: 1 },
  nearbyContainer: {
    borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  nearbyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: SPACING.sm, borderBottomWidth: 1,
  },
  nearbyText: { flex: 1, fontSize: FONT_SIZE.sm },
  cancelParkedBtn: { alignItems: 'center', paddingTop: SPACING.sm },
  loadingParked: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.md },
  loadingText: { fontSize: FONT_SIZE.sm },
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.base, fontWeight: '700', marginBottom: SPACING.sm },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.lg },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', marginBottom: SPACING.xs },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg,
  },
  parkedCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 18, borderRadius: RADIUS.lg,
    marginBottom: SPACING.md, width: '100%',
  },
  parkedCtaText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },
  parkingLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1,
    marginTop: SPACING.sm,
  },
  parkingLinkText: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: '500' },
  cityRow: { marginBottom: SPACING.sm },
});
