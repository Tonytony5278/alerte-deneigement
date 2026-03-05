import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStatusColor } from '@/constants/colors';

interface StatusBadgeProps {
  etat: number | null;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function StatusBadge({ etat, size = 'md', showIcon = true }: StatusBadgeProps) {
  const status = getStatusColor(etat ?? -1);
  const { padding, fontSize, iconSize } = SIZES[size];

  return (
    <View style={[styles.badge, { backgroundColor: status.bg, paddingHorizontal: padding, paddingVertical: padding / 2 }]}>
      {showIcon && (
        <Ionicons
          name={status.icon as keyof typeof Ionicons.glyphMap}
          size={iconSize}
          color={status.text}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, { color: status.text, fontSize }]}>
        {status.label}
      </Text>
    </View>
  );
}

const SIZES = {
  sm:  { padding: 6,  fontSize: 11, iconSize: 12 },
  md:  { padding: 8,  fontSize: 13, iconSize: 14 },
  lg:  { padding: 10, fontSize: 15, iconSize: 16 },
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: '600',
  },
});
