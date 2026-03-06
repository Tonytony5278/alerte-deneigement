import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '@/constants/colors';
import { StatusBadge } from './StatusBadge';
import type { WatchResult, TowingStatus } from '@/services/api';
import { formatDateTimeShort, formatRelativeTime } from '@/utils/formatters';
import { useTowingCountdown } from '@/utils/useTowingCountdown';

interface StreetCardProps {
  watch: WatchResult;
  onPressDeplacer?: () => void;
  onPress?: () => void;
}

export function StreetCard({ watch, onPressDeplacer, onPress }: StreetCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];

  const streetName = watch.nom_voie ?? watch.segment_id;
  const formattedDate = watch.date_deb_planif ? formatDateTimeShort(watch.date_deb_planif) : null;
  const lastUpdate = watch.updated_at ? formatRelativeTime(watch.updated_at) : null;
  const towingCountdown = useTowingCountdown(watch.date_deb_planif, watch.towing_status);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      accessibilityRole="button"
      accessibilityLabel={`Rue ${streetName}, statut: ${watch.etat_label ?? 'Inconnu'}`}
    >
      <View style={styles.header}>
        <View style={styles.streetInfo}>
          <Text style={[styles.streetName, { color: C.text }]} numberOfLines={1}>
            {streetName}
          </Text>
          {watch.arrondissement && (
            <Text style={[styles.arrondissement, { color: C.textSecondary }]}>
              {watch.arrondissement}{watch.cote ? ` · côté ${watch.cote}` : ''}
            </Text>
          )}
        </View>
        <StatusBadge etat={watch.etat ?? null} size="sm" />
      </View>

      {watch.towing_status === 'active' && (
        <View style={[styles.towingRow, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="warning" size={13} color="#DC2626" />
          <Text style={styles.towingActiveText}>Remorquage actif</Text>
        </View>
      )}
      {watch.towing_status === 'imminent' && (
        <View style={[styles.towingRow, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="alert-circle-outline" size={13} color="#92400E" />
          <Text style={styles.towingImminentText}>
            {towingCountdown ? `Remorquage dans ${towingCountdown}` : 'Remorquage imminent'}
          </Text>
        </View>
      )}

      {formattedDate && (
        <View style={styles.planifRow}>
          <Ionicons name="time-outline" size={14} color={C.textSecondary} />
          <Text style={[styles.planifText, { color: C.textSecondary }]}>
            Prévu: {formattedDate}
          </Text>
        </View>
      )}

      {lastUpdate && (
        <Text style={[styles.updated, { color: C.textMuted }]}>
          Màj: {lastUpdate}
        </Text>
      )}

      {onPressDeplacer && (
        <TouchableOpacity
          onPress={onPressDeplacer}
          style={[styles.deplacerBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="J'ai déplacé mon auto"
        >
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={[styles.deplacerText, { color: C.text }]}>
            J&apos;ai déplacé mon auto
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  streetInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  streetName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  arrondissement: {
    fontSize: FONT_SIZE.sm,
  },
  planifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  planifText: {
    fontSize: FONT_SIZE.sm,
  },
  updated: {
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
  },
  deplacerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  deplacerText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  towingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  towingActiveText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: '#DC2626',
  },
  towingImminentText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: '#92400E',
  },
});
