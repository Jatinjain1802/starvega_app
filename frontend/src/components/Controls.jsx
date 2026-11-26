import React, { useState } from 'react';
import Icon from '../screens/owner/Icon';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export { PropertyPicker, MonthPicker, monthLabel } from '../screens/owner/Controls';

export function displayName(value) {
  if (value === 'UPI') return value;
  const label = String(value ?? '')
    .toLowerCase()
    .replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function Choices({ label, options, value, onChange, disabled = false, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const selected = options.find((opt) => (Array.isArray(opt) ? opt[0] : opt) === value);
  const selectedLabel = Array.isArray(selected) ? selected[1] : displayName(value);
  return (
    <View style={styles.group}>
      {compact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label + ', ' + selectedLabel}
          accessibilityState={{ expanded, disabled }}
          disabled={disabled}
          onPress={() => setExpanded((v) => !v)}
          style={styles.filter}
        >
          <Text style={styles.label}>{label}</Text>
          <View style={styles.filterValue}>
            <Text style={styles.text}>{selectedLabel}</Text>
            <Icon name="down" size={16} />
          </View>
        </Pressable>
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
      {(!compact || expanded) && (
        <View style={styles.options} accessibilityRole="radiogroup">
          {options.map((option) => {
            const [key, title] = Array.isArray(option) ? option : [option, displayName(option)];
            const checked = value === key;
            return (
              <Pressable
                key={String(key)}
                accessibilityRole="radio"
                accessibilityLabel={title}
                accessibilityState={{ checked, disabled }}
                disabled={disabled}
                onPress={() => {
                  onChange(key);
                  if (compact) setExpanded(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  checked && styles.active,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[styles.text, checked && styles.activeText]}>{title}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  filter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  filterValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  group: { gap: 8 },
  label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: {
    minHeight: 44,
    maxWidth: '100%',
    justifyContent: 'center',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.soft,
  },
  active: { backgroundColor: colors.primary },
  text: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  activeText: { color: 'white' },
});
