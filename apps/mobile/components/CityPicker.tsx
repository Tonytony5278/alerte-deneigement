import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, useColorScheme, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, BRAND } from '@/constants/colors';

export interface CityOption {
  id: string;
  name: string;
  available: boolean;
}

interface CityPickerProps {
  cities: CityOption[];
  selectedCityId: string;
  onSelect: (cityId: string) => void;
  /** If true, render inline (for onboarding). If false, show a trigger button + modal. */
  inline?: boolean;
}

export function CityPicker({ cities, selectedCityId, onSelect, inline = false }: CityPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];
  const [modalVisible, setModalVisible] = React.useState(false);

  const selectedCity = cities.find((c) => c.id === selectedCityId);

  const CityList = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {cities.map((city) => {
        const isSelected = city.id === selectedCityId;
        const isAvailable = city.available;
        return (
          <TouchableOpacity
            key={city.id}
            onPress={() => {
              if (!isAvailable) return;
              onSelect(city.id);
              setModalVisible(false);
            }}
            activeOpacity={isAvailable ? 0.75 : 1}
            style={[
              styles.cityRow,
              {
                backgroundColor: isSelected ? BRAND.secondary : C.surface,
                borderColor: isSelected ? BRAND.primary : C.border,
                opacity: isAvailable ? 1 : 0.5,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: !isAvailable }}
            accessibilityLabel={city.name + (isAvailable ? '' : ' — Bientôt disponible')}
          >
            <View style={styles.cityRowLeft}>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'location-outline'}
                size={20}
                color={isSelected ? BRAND.primary : C.icon}
              />
              <Text
                style={[
                  styles.cityName,
                  { color: isSelected ? BRAND.primary : C.text, fontWeight: isSelected ? '700' : '500' },
                ]}
              >
                {city.name}
              </Text>
            </View>
            {!isAvailable && (
              <View style={[styles.soonBadge, { backgroundColor: C.surfaceElevated }]}>
                <Text style={[styles.soonText, { color: C.textSecondary }]}>Bientôt</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  if (inline) {
    return <CityList />;
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[styles.trigger, { backgroundColor: C.surfaceElevated, borderColor: C.border }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Ville sélectionnée: ${selectedCity?.name ?? selectedCityId}`}
      >
        <Ionicons name="location" size={16} color={BRAND.primary} />
        <Text style={[styles.triggerText, { color: C.text }]}>
          {selectedCity?.name ?? selectedCityId}
        </Text>
        <Ionicons name="chevron-down" size={14} color={C.icon} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Choisir une ville</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={24} color={C.icon} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <CityList />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  triggerText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    marginBottom: SPACING.sm,
  },
  cityRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cityName: {
    fontSize: FONT_SIZE.base,
  },
  soonBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  soonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
});
