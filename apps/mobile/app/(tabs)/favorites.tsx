import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, SafeAreaView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONT_SIZE, BRAND } from '@/constants/colors';
import { useWatchStore } from '@/stores/watchStore';
import { StreetCard } from '@/components/StreetCard';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';

export default function FavoritesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  const { watches, removeWatch, isLoading } = useWatchStore();

  function handleRemove(watchId: string, streetName: string) {
    Alert.alert(
      'Supprimer la surveillance',
      `Arrêter de surveiller "${streetName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => removeWatch(watchId),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <FlatList
        data={watches}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <DisclaimerBanner />
            {watches.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="star-outline" size={56} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>Aucune adresse surveillée</Text>
                <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
                  Cherche une adresse ou utilise "Je suis stationné ici" sur l&apos;écran d&apos;accueil.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/')}
                  style={[styles.addBtn, { backgroundColor: BRAND.primary }]}
                >
                  <Text style={styles.addBtnText}>Aller à l&apos;accueil</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.watchItem}>
            <StreetCard
              watch={item}
              onPress={() => router.push(`/street/${item.segment_id}`)}
            />
            <TouchableOpacity
              onPress={() => handleRemove(item.id, item.nom_voie ?? item.segment_id)}
              style={[styles.removeBtn, { backgroundColor: C.surfaceElevated }]}
              accessibilityLabel="Supprimer cette surveillance"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          watches.length > 0 ? (
            <Text style={[styles.footer, { color: C.textMuted }]}>
              {watches.length} adresse{watches.length > 1 ? 's' : ''} surveillée{watches.length > 1 ? 's' : ''}
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: SPACING.md, paddingBottom: SPACING['2xl'] },
  watchItem: { position: 'relative', marginBottom: SPACING.xs },
  removeBtn: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingVertical: SPACING['2xl'] },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20, paddingHorizontal: SPACING.xl },
  addBtn: { marginTop: SPACING.lg, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.base },
  footer: { textAlign: 'center', fontSize: FONT_SIZE.xs, marginTop: SPACING.md },
});
