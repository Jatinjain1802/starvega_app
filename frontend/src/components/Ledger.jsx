import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function LedgerLine({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
export function Meter({ percent }) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.track}>
      <View style={[styles.fill, { width: Math.max(0, Math.min(100, percent || 0)) + '%' }]} />
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: { color: colors.muted, fontSize: 14 },
  value: { color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'], fontSize: 16 },
  track: { height: 6, backgroundColor: colors.soft, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.brass, borderRadius: 3 },
});
