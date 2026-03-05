import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '@/constants/colors';
import { StatusBadge } from './StatusBadge';
import type { WatchResult } from '@/services/api';

interface StreetCardProps {
  watch: WatchResult;
  onPressDeplacer?: () => void;
  onPress?: () => void;
}

export function StreetCard({ watch, onPressDeplacer, onPress }: StreetCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];

  const streetName = watch.nom_voie ?? watch.segment_id;
  const formattedDate = watch.date_deb_planif ? formatDateTime(watch.date_deb_planif) : null;
  const lastUpdate = watch.updated_at ? formatRelativeTime(watch.updated_at) : null;

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const time = d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (isToday) return `Aujourd'hui à ${time}`;
  return d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' }) + ` à ${time}`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.round(hrs / 24)}j`;
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
});
