import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '@/constants/colors';

export function DisclaimerBanner() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: C.warningBg,
          borderColor: C.warningBorder,
        },
      ]}
      accessibilityRole="none"
    >
      <Ionicons name="warning-outline" size={14} color={C.warningText} style={styles.icon} />
      <Text style={[styles.text, { color: C.warningText }]}>
        La signalisation sur rue prime toujours — cette app est un outil d&apos;aide, pas une garantie.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    marginBottom: SPACING.sm,
  },
  icon: {
    marginRight: 6,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZE.xs + 1,
    fontWeight: '500',
    lineHeight: 18,
  },
});
