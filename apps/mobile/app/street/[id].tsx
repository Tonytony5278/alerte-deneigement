import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useColorScheme, SafeAreaView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { COLORS, SPACING, RADIUS, FONT_SIZE, BRAND, type ThemeColors } from '@/constants/colors';
import { getStreet, submitReport, type StreetResult } from '@/services/api';
import { StatusBadge } from '@/components/StatusBadge';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { useWatchStore } from '@/stores/watchStore';
import { formatDateTime, formatRelativeTime } from '@/utils/formatters';

export default function StreetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];

  const { watches, addWatch, removeWatch, getWatchForSegment, anonUserId } = useWatchStore();
  const watch = getWatchForSegment(id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const { data: street, isLoading, error, refetch } = useQuery<StreetResult>({
    queryKey: ['street', id],
    queryFn: () => getStreet(id!),
    enabled: !!id,
    refetchInterval: 2 * 60 * 1000, // refresh every 2 min
  });

  async function handleToggleWatch() {
    if (!street) return;
    setSubmitting(true);
    try {
      if (watch) {
        await removeWatch(watch.id);
      } else {
        await addWatch(street);
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de modifier la surveillance');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReport() {
    Alert.alert(
      'Signaler une erreur',
      'Le statut affiché ne correspond pas à la réalité sur la rue ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signaler',
          onPress: async () => {
            try {
              await submitReport({
                segmentId: id!,
                anonUserId: anonUserId ?? undefined,
                type: 'wrong_status',
              });
            } catch {
              // best-effort — don't block the user
            }
            setReportSent(true);
            Alert.alert('Merci !', 'Ton signalement nous aide à corriger les données.');
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={BRAND.primary} size="large" />
      </View>
    );
  }

  if (error || !street) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={C.textMuted} />
        <Text style={[styles.errorText, { color: C.textSecondary }]}>Impossible de charger la rue</Text>
        <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { borderColor: C.border }]}>
          <Text style={{ color: C.text }}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDebPlanif = street.date_deb_planif ? formatDateTime(street.date_deb_planif) : null;
  const formattedFinPlanif = street.date_fin_planif ? formatDateTime(street.date_fin_planif) : null;
  const lastUpdate = street.updated_at ? formatRelativeTime(street.updated_at) : null;

  const dataAgeMinutes = street.updated_at
    ? (Date.now() - new Date(street.updated_at).getTime()) / 60_000
    : null;
  const isStaleData = dataAgeMinutes !== null && dataAgeMinutes > 30;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Street header */}
        <View style={styles.streetHeader}>
          <Text style={[styles.streetName, { color: C.text }]}>{street.nom_voie}</Text>
          {(street.arrondissement || street.cote) && (
            <Text style={[styles.streetMeta, { color: C.textSecondary }]}>
              {[street.arrondissement, street.cote ? `côté ${street.cote}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
          <View style={styles.badgeRow}>
            <StatusBadge etat={street.etat ?? null} size="lg" />
          </View>
        </View>

        {/* Stale data warning */}
        {isStaleData && (
          <View style={[styles.staleBanner, { backgroundColor: C.warningBg, borderColor: C.warningBorder }]}>
            <Ionicons name="time-outline" size={14} color={C.warningText} />
            <Text style={[styles.staleText, { color: C.warningText }]}>
              Données potentiellement obsolètes · {lastUpdate}
            </Text>
          </View>
        )}

        {/* Timeline */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.textMuted }]}>TIMELINE</Text>

          <TimelineItem
            icon="time-outline"
            label="Dernière mise à jour"
            value={lastUpdate ?? '—'}
            C={C}
          />

          {formattedDebPlanif && (
            <TimelineItem
              icon="calendar-outline"
              label="Début de l'interdiction"
              value={formattedDebPlanif}
              C={C}
            />
          )}

          {formattedFinPlanif && (
            <TimelineItem
              icon="flag-outline"
              label="Fin prévue"
              value={formattedFinPlanif}
              C={C}
              last
            />
          )}

          {!formattedDebPlanif && !formattedFinPlanif && (
            <Text style={[styles.noSchedule, { color: C.textMuted }]}>
              Aucun chargement prévu pour l&apos;instant
            </Text>
          )}
        </View>

        {/* Watch toggle */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.textMuted }]}>SURVEILLANCE</Text>
          <TouchableOpacity
            onPress={handleToggleWatch}
            disabled={submitting}
            style={[
              styles.watchBtn,
              { backgroundColor: watch ? '#FEE2E2' : BRAND.primary },
            ]}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color={watch ? '#EF4444' : '#fff'} />
            ) : (
              <>
                <Ionicons
                  name={watch ? 'close-circle-outline' : 'notifications'}
                  size={20}
                  color={watch ? '#EF4444' : '#fff'}
                />
                <Text style={[styles.watchBtnText, { color: watch ? '#EF4444' : '#fff' }]}>
                  {watch ? 'Arrêter la surveillance' : 'Surveiller cette rue'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {watch && (
            <Text style={[styles.watchNote, { color: C.textSecondary }]}>
              Rappels: {watch.notify_t60 ? '60 min ✓' : ''} {watch.notify_t30 ? '30 min ✓' : ''}
            </Text>
          )}
        </View>

        {/* Disclaimer */}
        <DisclaimerBanner />

        {/* Report error */}
        <TouchableOpacity
          onPress={handleReport}
          disabled={reportSent}
          style={[styles.reportBtn, { borderColor: C.border }]}
          accessibilityRole="button"
        >
          <Ionicons name="flag-outline" size={16} color={reportSent ? C.textMuted : C.text} />
          <Text style={[styles.reportText, { color: reportSent ? C.textMuted : C.text }]}>
            {reportSent ? 'Erreur signalée — merci !' : 'Signaler une erreur'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineItem({
  icon, label, value, C, last = false,
}: {
  icon: string;
  label: string;
  value: string;
  C: ThemeColors;
  last?: boolean;
}) {
  return (
    <View style={[styles.timelineItem, !last && { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={C.icon} style={{ width: 20 }} />
      <View style={styles.timelineText}>
        <Text style={[styles.timelineLabel, { color: C.textSecondary }]}>{label}</Text>
        <Text style={[styles.timelineValue, { color: C.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING['2xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  streetHeader: { marginBottom: SPACING.md },
  streetName: { fontSize: FONT_SIZE['2xl'], fontWeight: '800', marginBottom: 4 },
  streetMeta: { fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm },
  badgeRow: { flexDirection: 'row' },
  card: {
    borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  cardTitle: { fontSize: FONT_SIZE.xs, fontWeight: '700', letterSpacing: 1, marginBottom: SPACING.sm },
  timelineItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.sm,
  },
  timelineText: { flex: 1 },
  timelineLabel: { fontSize: FONT_SIZE.xs },
  timelineValue: { fontSize: FONT_SIZE.sm, fontWeight: '600', marginTop: 2 },
  noSchedule: { fontSize: FONT_SIZE.sm, fontStyle: 'italic' },
  watchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: RADIUS.md,
  },
  watchBtnText: { fontSize: FONT_SIZE.base, fontWeight: '700' },
  watchNote: { fontSize: FONT_SIZE.xs, textAlign: 'center', marginTop: SPACING.sm },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: SPACING.sm + 4, borderRadius: RADIUS.md,
    borderWidth: 1, marginTop: SPACING.sm,
  },
  reportText: { fontSize: FONT_SIZE.sm },
  errorText: { fontSize: FONT_SIZE.sm, textAlign: 'center' },
  retryBtn: {
    marginTop: SPACING.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1,
  },
  staleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm, marginBottom: SPACING.sm, borderWidth: 1,
  },
  staleText: { fontSize: FONT_SIZE.xs, flex: 1 },
});
