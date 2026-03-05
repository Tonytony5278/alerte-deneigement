import React, { useState } from 'react';
import {
  View, Text, Switch, TouchableOpacity, StyleSheet, useColorScheme,
  SafeAreaView, ScrollView, Linking, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONT_SIZE, BRAND } from '@/constants/colors';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWatchStore } from '@/stores/watchStore';

// Half-hour increments for quiet hours
const START_TIMES = ['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30','00:00'];
const END_TIMES   = ['04:00','04:30','05:00','05:30','06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00'];

function TimePickerModal({
  visible,
  title,
  times,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  times: string[];
  selected: string;
  onSelect: (t: string) => void;
  onClose: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
        <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
          <Text style={[styles.modalTitle, { color: C.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Fermer">
            <Ionicons name="close" size={22} color={C.icon} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={times}
          keyExtractor={(t) => t}
          renderItem={({ item }) => {
            const isSelected = item === selected;
            return (
              <TouchableOpacity
                style={[styles.timeOption, { borderBottomColor: C.border }, isSelected && { backgroundColor: BRAND.secondary }]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.timeOptionText, { color: isSelected ? BRAND.primary : C.text, fontWeight: isSelected ? '700' : '400' }]}>
                  {item}
                </Text>
                {isSelected && <Ionicons name="checkmark" size={18} color={BRAND.primary} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  const settings = useSettingsStore();
  const { watches, anonUserId, syncNotifPrefsToServer } = useWatchStore();

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleToggle(key: 'notifyOnChange' | 'notifyT60' | 'notifyT30' | 'stormAlerts', value: boolean) {
    await settings.update({ [key]: value });
    if (key !== 'stormAlerts' && watches.length > 0) {
      await syncNotifPrefsToServer({
        notifyOnChange: key === 'notifyOnChange' ? value : settings.notifyOnChange,
        notifyT60: key === 'notifyT60' ? value : settings.notifyT60,
        notifyT30: key === 'notifyT30' ? value : settings.notifyT30,
        quietStart: settings.quietStart,
        quietEnd: settings.quietEnd,
      });
    }
  }

  async function handleQuietTime(field: 'quietStart' | 'quietEnd', value: string) {
    await settings.update({ [field]: value });
    if (watches.length > 0) {
      setSyncing(true);
      try {
        await syncNotifPrefsToServer({
          notifyOnChange: settings.notifyOnChange,
          notifyT60: settings.notifyT60,
          notifyT30: settings.notifyT30,
          quietStart: field === 'quietStart' ? value : settings.quietStart,
          quietEnd: field === 'quietEnd' ? value : settings.quietEnd,
        });
      } finally {
        setSyncing(false);
      }
    }
  }

  function SettingRow({
    label, subLabel, value, onToggle,
  }: { label: string; subLabel?: string; value: boolean; onToggle: (v: boolean) => void }) {
    return (
      <View style={[styles.row, { borderBottomColor: C.border }]}>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: C.text }]}>{label}</Text>
          {subLabel && <Text style={[styles.rowSub, { color: C.textSecondary }]}>{subLabel}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: C.border, true: BRAND.primary }}
          thumbColor="#fff"
          accessibilityLabel={label}
        />
      </View>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.textMuted }]}>{title.toUpperCase()}</Text>
        <View style={[styles.sectionContent, { backgroundColor: C.surface, borderColor: C.border }]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Notifications">
          <SettingRow
            label="Changement de statut"
            subLabel="Alerte dès qu'une opération est planifiée"
            value={settings.notifyOnChange}
            onToggle={(v) => handleToggle('notifyOnChange', v)}
          />
          <SettingRow
            label="Rappel 60 minutes"
            subLabel="Push 1h avant le début du chargement"
            value={settings.notifyT60}
            onToggle={(v) => handleToggle('notifyT60', v)}
          />
          <SettingRow
            label="Rappel 30 minutes"
            subLabel="Push 30 min avant (plus urgent)"
            value={settings.notifyT30}
            onToggle={(v) => handleToggle('notifyT30', v)}
          />
          <SettingRow
            label="Alertes tempête"
            subLabel="Notification lors de grosses opérations"
            value={settings.stormAlerts}
            onToggle={(v) => handleToggle('stormAlerts', v)}
          />
        </Section>

        <Section title={`Heures silencieuses${syncing ? ' · Sync…' : ''}`}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: C.border }]}
            onPress={() => setShowStartPicker(true)}
            accessibilityRole="button"
          >
            <Text style={[styles.rowLabel, { color: C.text }]}>Début</Text>
            <View style={styles.timeValue}>
              <Text style={[styles.rowValue, { color: BRAND.primary }]}>{settings.quietStart}</Text>
              <Ionicons name="chevron-down" size={14} color={C.icon} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: C.border }]}
            onPress={() => setShowEndPicker(true)}
            accessibilityRole="button"
          >
            <Text style={[styles.rowLabel, { color: C.text }]}>Fin</Text>
            <View style={styles.timeValue}>
              <Text style={[styles.rowValue, { color: BRAND.primary }]}>{settings.quietEnd}</Text>
              <Ionicons name="chevron-down" size={14} color={C.icon} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.quietNote, { color: C.textMuted }]}>
            Les notifications urgentes (en cours) ne sont jamais silencieuses.
          </Text>
        </Section>

        <Section title="Données & confidentialité">
          <View style={[styles.row, { borderBottomColor: C.border }]}>
            <Text style={[styles.rowLabel, { color: C.text }]}>Identifiant anonyme</Text>
            <Text style={[styles.rowValue, { color: C.textMuted, fontSize: 10 }]} numberOfLines={1}>
              {anonUserId ? `…${anonUserId.slice(-8)}` : '—'}
            </Text>
          </View>
          <View style={[styles.row, { borderBottomColor: C.border }]}>
            <Text style={[styles.rowLabel, { color: C.text }]}>Surveillances actives</Text>
            <Text style={[styles.rowValue, { color: C.textMuted }]}>{watches.length}</Text>
          </View>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: 'transparent' }]}
            onPress={() => Linking.openURL('https://alertneige.app/confidentialite')}
            accessibilityRole="link"
          >
            <Text style={[styles.rowLabel, { color: C.text }]}>Politique de confidentialité</Text>
            <Ionicons name="open-outline" size={16} color={C.icon} />
          </TouchableOpacity>
        </Section>

        <Section title="À propos">
          <View style={[styles.row, { borderBottomColor: C.border }]}>
            <Text style={[styles.rowLabel, { color: C.text }]}>Version</Text>
            <Text style={[styles.rowValue, { color: C.textMuted }]}>1.0.0</Text>
          </View>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: C.border }]}
            onPress={() => Linking.openURL('https://alertneige.app/source-donnees')}
            accessibilityRole="link"
          >
            <Text style={[styles.rowLabel, { color: C.text }]}>Source des données</Text>
            <Ionicons name="open-outline" size={16} color={C.icon} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: 'transparent' }]}
            onPress={() => Linking.openURL('mailto:info@alertneige.app')}
            accessibilityRole="link"
          >
            <Text style={[styles.rowLabel, { color: C.text }]}>Envoyer des commentaires</Text>
            <Ionicons name="mail-outline" size={16} color={C.icon} />
          </TouchableOpacity>
        </Section>

        <View style={styles.disclaimer}>
          <Text style={[styles.disclaimerText, { color: C.textMuted }]}>
            Données fournies par les villes participantes (données ouvertes). La signalisation
            sur rue prime toujours. Cette app est un outil d&apos;aide, pas une garantie légale.
          </Text>
        </View>
      </ScrollView>

      <TimePickerModal
        visible={showStartPicker}
        title="Début des heures silencieuses"
        times={START_TIMES}
        selected={settings.quietStart}
        onSelect={(t) => handleQuietTime('quietStart', t)}
        onClose={() => setShowStartPicker(false)}
      />
      <TimePickerModal
        visible={showEndPicker}
        title="Fin des heures silencieuses"
        times={END_TIMES}
        selected={settings.quietEnd}
        onSelect={(t) => handleQuietTime('quietEnd', t)}
        onClose={() => setShowEndPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING['2xl'] },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.xs, fontWeight: '600', letterSpacing: 1, marginBottom: SPACING.xs, marginLeft: SPACING.xs },
  sectionContent: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, marginRight: SPACING.sm },
  rowLabel: { fontSize: FONT_SIZE.base, fontWeight: '500' },
  rowSub: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  rowValue: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  timeValue: { flexDirection: 'row', alignItems: 'center' },
  quietNote: { fontSize: FONT_SIZE.xs, padding: SPACING.sm, fontStyle: 'italic' },
  disclaimer: { marginTop: SPACING.sm, paddingHorizontal: SPACING.xs },
  disclaimerText: { fontSize: FONT_SIZE.xs, lineHeight: 18, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    maxHeight: '50%', overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: FONT_SIZE.base, fontWeight: '700' },
  timeOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeOptionText: { fontSize: FONT_SIZE.base },
});
