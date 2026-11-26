import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors } from './portfolio';

export function PropertyPicker({ items, value, onChange, disabled = false }) {
  const [expanded, setExpanded] = useState(false);
  const selected = items.find(p => p.id === value);
  const canSwitch = items.length > 1;
  function choose(id) {
    setExpanded(false);
    if (id !== value) onChange(id);
  }
  return <View style={styles.picker}>
    <Pressable disabled={!canSwitch || disabled} accessibilityRole={canSwitch ? 'button' : 'text'}
      accessibilityLabel={'Property, ' + (selected?.name || 'Choose property')}
      accessibilityState={canSwitch ? { expanded, disabled } : undefined}
      onPress={() => setExpanded(!expanded)} style={styles.row}>
      <View style={styles.iconBox}><Icon name="building" /></View>
      <View style={styles.grow}><Text style={styles.caption}>Property</Text>
        <Text style={styles.label}>{selected?.name || 'Choose property'}</Text></View>
      {canSwitch && <Icon name="down" size={18} />}
    </Pressable>
    {expanded && canSwitch && items.map(p => <Pressable key={p.id ?? 'all'} disabled={disabled}
      accessibilityRole="radio" accessibilityState={{ checked: value === p.id, disabled }}
      style={[styles.option, value === p.id && styles.selected]} onPress={() => choose(p.id)}>
      <Text style={value === p.id ? styles.selectedText : styles.label}>{p.name}</Text>
      {!!p.address && <Text style={value === p.id ? styles.selectedText : styles.caption}>{p.address}</Text>}
    </Pressable>)}
  </View>;
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
    return <Pressable accessibilityRole="button" accessibilityLabel={delta < 0 ? 'Previous month' : 'Next month'}
      accessibilityState={{ disabled: blocked }} disabled={blocked} onPress={() => move(delta)}
      style={[styles.arrow, blocked && { opacity: 0.3 }, delta < 0 && { transform: [{rotate: '180deg'}] }]}>
      <Icon name="arrow" size={16} />
    </Pressable>;
  }
  return <View style={styles.month}>{arrow(-1, disabled || month <= '2000-01')}
    <Text style={styles.monthName}>{monthLabel(month)}</Text>{arrow(1, disabled || month >= latest)}</View>;
}

const styles = StyleSheet.create({
  selected: { backgroundColor: colors.primary }, selectedText: { color: '#fff', fontWeight: '600' },
  picker: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 54 },
  iconBox: { backgroundColor: colors.soft, borderRadius: 12, padding: 9 },
  grow: { flex: 1 }, caption: { color: colors.muted, fontSize: 13 }, label: { color: colors.text, fontWeight: '700', fontSize: 15 },
  option: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 17, justifyContent: 'center', gap: 3, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  monthName: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.soft }
});
