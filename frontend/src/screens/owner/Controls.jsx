import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Icon from './Icon';
import { colors } from './portfolio';

export function PropertyPicker({ items, value, onChange, disabled = false, inset = false }) {
  const [expanded, setExpanded] = useState(false);
  const selected = items.find((p) => p.id === value);
  const canSwitch = items.length > 1;
  function choose(id) {
    setExpanded(false);
    if (id !== value) onChange(id);
  }
  return (
    <View style={inset ? undefined : styles.picker}>
      <Pressable
        disabled={!canSwitch || disabled}
        accessibilityRole={canSwitch ? 'button' : 'text'}
        accessibilityLabel={'Property, ' + (selected?.name || 'Choose property')}
        accessibilityState={canSwitch ? { expanded, disabled } : undefined}
        onPress={() => setExpanded(!expanded)}
        style={styles.row}
      >
        {!inset && (
          <View style={styles.iconBox}>
            <Icon name="building" color={colors.brass} />
          </View>
        )}
        <View style={styles.grow}>
          <Text style={styles.caption}>Property</Text>
          <Text style={styles.label}>{selected?.name || 'Choose property'}</Text>
        </View>
        {canSwitch && <Icon name="down" size={18} />}
      </Pressable>
      {expanded &&
        canSwitch &&
        items.map((p) => (
          <Pressable
            key={p.id ?? 'all'}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === p.id, disabled }}
            style={[styles.option, value === p.id && styles.selected]}
            onPress={() => choose(p.id)}
          >
            <Text style={value === p.id ? styles.selectedText : styles.label}>{p.name}</Text>
            {!!p.address && (
              <Text style={value === p.id ? styles.selectedText : styles.caption}>{p.address}</Text>
            )}
          </Pressable>
        ))}
    </View>
  );
}

export function PortfolioFilters({
  properties,
  propertyId,
  onPropertyChange,
  month,
  onMonthChange,
  latest,
}) {
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = width >= 385 && fontScale <= 1.15;
  return (
    <View style={[styles.filters, sideBySide && styles.beside]}>
      <View style={sideBySide && styles.propertyColumn}>
        <PropertyPicker
          inset
          items={[{ id: null, name: 'All properties' }, ...properties]}
          value={propertyId}
          onChange={onPropertyChange}
        />
      </View>
      <View style={sideBySide ? styles.periodColumn : styles.periodRow}>
        <MonthPicker month={month} latest={latest} onChange={onMonthChange} />
      </View>
    </View>
  );
}

export function monthLabel(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function MonthPicker({ month, onChange, latest, disabled = false }) {
  function move(delta) {
    const [y, m] = month.split('-').map(Number);
    onChange(new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7));
  }
  function arrow(delta, blocked) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={delta < 0 ? 'Previous month' : 'Next month'}
        accessibilityState={{ disabled: blocked }}
        disabled={blocked}
        onPress={() => move(delta)}
        style={[
          styles.arrow,
          blocked && { opacity: 0.3 },
          delta < 0 && { transform: [{ rotate: '180deg' }] },
        ]}
      >
        <Icon name="arrow" size={16} />
      </Pressable>
    );
  }
  return (
    <View style={styles.month}>
      {arrow(-1, disabled || month <= '2000-01')}
      <Text style={styles.monthName}>{monthLabel(month)}</Text>
      {arrow(1, disabled || month >= latest)}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  beside: { flexDirection: 'row', alignItems: 'flex-start' },
  propertyColumn: { flex: 1, minWidth: 0 },
  periodColumn: {
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderColor: colors.border,
  },
  periodRow: { borderTopWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.primary },
  selectedText: { color: '#fff', fontWeight: '600' },
  picker: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 54 },
  iconBox: { backgroundColor: colors.soft, borderRadius: 12, padding: 9 },
  grow: { flex: 1 },
  caption: { color: colors.muted, fontSize: 13 },
  label: { color: colors.text, fontWeight: '700', fontSize: 15 },
  option: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 17,
    justifyContent: 'center',
    gap: 3,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 0 },
  monthName: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.text },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
});
