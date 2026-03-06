import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View, Text, TouchableOpacity, StyleSheet, useColorScheme, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { COLORS, SPACING, RADIUS, FONT_SIZE, BRAND, type ThemeColors } from '@/constants/colors';
import { FALLBACK_CITIES } from '@/constants/cities';
import { requestPermissions } from '@/services/notificationService';
import { useSettingsStore } from '@/stores/settingsStore';
import { CityPicker } from '@/components/CityPicker';
import { getCities, type CityConfig } from '@/services/api';

type OnboardingStep = 'city' | 'location' | 'notifications' | 'start';

const STEPS: OnboardingStep[] = ['city', 'location', 'notifications', 'start'];

export default function OnboardingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  const { completeOnboarding, update } = useSettingsStore();
  const [step, setStep] = useState<OnboardingStep>('city');
  const [selectedCity, setSelectedCity] = useState('montreal');
  const { data: citiesData } = useQuery<CityConfig[]>({
    queryKey: ['cities'],
    queryFn: getCities,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const cities = citiesData ?? FALLBACK_CITIES;

  async function handleCityNext() {
    await update({ cityId: selectedCity });
    setStep('location');
  }

  async function handleLocationPermission() {
    await Location.requestForegroundPermissionsAsync();
    setStep('notifications');
  }

  async function handleNotificationPermission() {
    await requestPermissions();
    setStep('start');
  }

  async function handleFinish(mode: 'parked' | 'search') {
    await completeOnboarding();
    if (mode === 'parked') {
      router.replace('/(tabs)/?action=parked');
    } else {
      router.replace('/(tabs)/');
    }
  }

  const stepIndex = STEPS.indexOf(step);

  function goBack() {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <View style={styles.content}>
        {/* Back button */}
        {stepIndex > 0 && (
          <TouchableOpacity onPress={goBack} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
        )}

        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[styles.dot, { backgroundColor: i <= stepIndex ? BRAND.primary : C.border }]}
            />
          ))}
        </View>

        {step === 'city' && (
          <CityStep
            C={C}
            cities={cities}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            onNext={handleCityNext}
          />
        )}

        {step === 'location' && (
          <LocationStep C={C} onAllow={handleLocationPermission} onSkip={() => setStep('notifications')} />
        )}

        {step === 'notifications' && (
          <NotificationsStep C={C} onAllow={handleNotificationPermission} onSkip={() => setStep('start')} />
        )}

        {step === 'start' && (
          <StartStep C={C} onParked={() => handleFinish('parked')} onSearch={() => handleFinish('search')} />
        )}
      </View>
    </SafeAreaView>
  );
}

function CityStep({
  C, cities, selectedCity, onSelectCity, onNext,
}: {
  C: ThemeColors; cities: CityConfig[]; selectedCity: string; onSelectCity: (id: string) => void; onNext: () => void;
}) {
  return (
    <View style={styles.step}>
      <View style={[styles.iconCircle, { backgroundColor: BRAND.secondary }]}>
        <Ionicons name="snow" size={48} color={BRAND.primary} />
      </View>
      <Text style={[styles.title, { color: C.text }]}>Ta ville</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        Choisis ta ville pour recevoir les alertes de déneigement de ta rue.
      </Text>
      <View style={{ width: '100%', marginBottom: SPACING.xl }}>
        <CityPicker
          cities={cities}
          selectedCityId={selectedCity}
          onSelect={onSelectCity}
          inline
        />
      </View>
      <TouchableOpacity
        onPress={onNext}
        style={[styles.primaryBtn, { backgroundColor: BRAND.primary }]}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.primaryBtnText}>Continuer</Text>
      </TouchableOpacity>
    </View>
  );
}

function LocationStep({ C, onAllow, onSkip }: { C: ThemeColors; onAllow: () => void; onSkip: () => void }) {
  return (
    <View style={styles.step}>
      <View style={[styles.iconCircle, { backgroundColor: BRAND.secondary }]}>
        <Ionicons name="location" size={48} color={BRAND.primary} />
      </View>
      <Text style={[styles.title, { color: C.text }]}>Trouve ta rue auto</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        Pour détecter automatiquement où tu es stationné et trouver ta rue sans taper d&apos;adresse.{'\n\n'}
        Tu peux toujours chercher manuellement.
      </Text>
      <TouchableOpacity
        onPress={onAllow}
        style={[styles.primaryBtn, { backgroundColor: BRAND.primary }]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Activer la localisation"
      >
        <Text style={styles.primaryBtnText}>Activer la localisation</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkip} style={styles.skipBtn} accessibilityRole="button">
        <Text style={[styles.skipText, { color: C.textSecondary }]}>Pas maintenant</Text>
      </TouchableOpacity>
    </View>
  );
}

function NotificationsStep({ C, onAllow, onSkip }: { C: ThemeColors; onAllow: () => void; onSkip: () => void }) {
  return (
    <View style={styles.step}>
      <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
        <Ionicons name="notifications" size={48} color={BRAND.accent} />
      </View>
      <Text style={[styles.title, { color: C.text }]}>Reçois les alertes</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        On t&apos;envoie un push{' '}
        <Text style={{ fontWeight: '700', color: C.text }}>60 minutes avant</Text>{' '}
        le début du chargement — bien avant la remorque.{'\n\n'}
        Sans notifications, on ne peut pas t&apos;avertir.
      </Text>
      <TouchableOpacity
        onPress={onAllow}
        style={[styles.primaryBtn, { backgroundColor: BRAND.primary }]}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.primaryBtnText}>Activer les notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkip} style={styles.skipBtn} accessibilityRole="button">
        <Text style={[styles.skipText, { color: C.textSecondary }]}>Pas maintenant</Text>
      </TouchableOpacity>
    </View>
  );
}

function StartStep({ C, onParked, onSearch }: { C: ThemeColors; onParked: () => void; onSearch: () => void }) {
  return (
    <View style={styles.step}>
      <View style={[styles.iconCircle, { backgroundColor: BRAND.secondary }]}>
        <Ionicons name="snow" size={48} color={BRAND.primary} />
      </View>
      <Text style={[styles.title, { color: C.text }]}>Comment commencer ?</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>Choisis ton mode de départ.</Text>
      <TouchableOpacity
        onPress={onParked}
        style={[styles.primaryBtn, { backgroundColor: BRAND.primary }]}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Ionicons name="car" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Je suis stationné ici</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSearch}
        style={[styles.secondaryBtn, { borderColor: C.border }]}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Ionicons name="search" size={18} color={C.text} style={{ marginRight: 8 }} />
        <Text style={[styles.secondaryBtnText, { color: C.text }]}>Je cherche une adresse</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: SPACING.xl, justifyContent: 'center' },
  backBtn: {
    position: 'absolute', top: SPACING.md, left: 0, zIndex: 1,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: SPACING.xl },
  dot: { width: 8, height: 8, borderRadius: 4 },
  step: { alignItems: 'center' },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.md },
  subtitle: { fontSize: FONT_SIZE.base, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', paddingVertical: 16, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
  },
  primaryBtnText: { color: '#fff', fontSize: FONT_SIZE.base, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', paddingVertical: 16, borderRadius: RADIUS.md,
    borderWidth: 1.5, marginBottom: SPACING.sm,
  },
  secondaryBtnText: { fontSize: FONT_SIZE.base, fontWeight: '600' },
  skipBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xl },
  skipText: { fontSize: FONT_SIZE.sm },
});
