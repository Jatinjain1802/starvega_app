import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '../screens/owner/Icon';
import { colors } from '../theme';

export function RecordGroup({ children }) {
  return <View style={styles.group}>{children}</View>;
}

export default function RecordLink({
  title,
  detail,
  icon,
  badge,
  onPress,
  disabled = false,
  grouped = false,
  divider = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        grouped && styles.groupedRow,
        divider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      {!!icon && (
        <View style={styles.icon}>
          <Icon name={icon} size={20} color={colors.brass} />
        </View>
      )}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {!!detail && <Text style={styles.detail}>{detail}</Text>}
        {badge}
      </View>
      <Icon name="arrow" size={16} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  groupedRow: { borderWidth: 0, borderRadius: 0, minHeight: 72 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 68,
    padding: 13,
  },
  icon: { padding: 9, borderRadius: 20, backgroundColor: colors.soft },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  detail: { fontSize: 14, color: colors.muted },
  pressed: { backgroundColor: colors.soft },
});
