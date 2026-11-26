import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '../screens/owner/Icon';
import { colors } from '../theme';

export default function RecordLink({ title, detail, icon, badge, onPress, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {!!icon && (
        <View style={styles.icon}>
          <Icon name={icon} size={20} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    minHeight: 54,
    padding: 13,
  },
  icon: { padding: 9, borderRadius: 10, backgroundColor: colors.soft },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  detail: { fontSize: 14, color: colors.muted },
  pressed: { backgroundColor: colors.soft },
});
