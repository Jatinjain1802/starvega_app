import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type } from '../theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatCard({ label, value, detail, tone = 'default', style }) {
  return (
    <Card style={style}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          tone === 'danger' && styles.danger,
          tone === 'positive' && styles.positive,
        ]}
      >
        {value}
      </Text>
      {!!detail && <Text style={styles.label}>{detail}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 17,
    gap: 9,
  },
  label: { color: colors.muted, fontSize: 14 },
  value: { ...type.amount, color: colors.text, fontSize: 29 },
  danger: { color: colors.danger },
  positive: { color: colors.primary },
});
