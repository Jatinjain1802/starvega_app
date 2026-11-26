import React from 'react';
import { Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from './portfolio';
import Icon from './Icon';

export function Section({ children }) {
  return <Text accessibilityRole="header" style={styles.section}>{children}</Text>;
}

export function NotificationButton({ onPress }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" style={styles.bell} onPress={onPress}><Icon name="bell" /></Pressable>;
}

export function Highlight({ label, value, detail, action, onPress }) {
  return <View style={styles.hero}>
    <View style={styles.heroHeading}><Text style={styles.heroLabel}>{label}</Text><Icon name="star" size={24} color={colors.accent}/></View>
    <Text style={styles.amount}>{value}</Text>
    {!!detail && <Text style={styles.detail}>{detail}</Text>}
    {!!action && <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}>
      <Text style={styles.actionText}>{action}</Text><Icon name="arrow" size={15} color={colors.deep} />
    </Pressable>}
  </View>;
}

export function Shortcuts({ items, onSelect }) {
  const { width, fontScale } = useWindowDimensions();
  return <View style={styles.grid}>{items.map(([name, label, icon]) =>
    <Pressable key={name} accessibilityRole="button" onPress={() => onSelect(name)}
      style={({pressed}) => [styles.tile, {width: width < 350 || fontScale > 1.45 ? '100%' : '48%'}, pressed && styles.pressed]}>
      <Icon name={icon} size={20} /><Text style={styles.tileText}>{label}</Text>
    </Pressable>)}</View>;
}

const styles = StyleSheet.create({
  section: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 5 },
  bell: { minWidth: 46, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface },
  hero: { padding: 22, gap: 6, borderRadius: 23, backgroundColor: colors.deep },
  heroHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroLabel: { flex: 1, color: '#D3EEE4', fontSize: 15, fontWeight: '600' }, amount: { color: '#fff', fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  detail: { color: '#D3EEE4', fontSize: 14 }, heroAction: { marginTop: 10, paddingHorizontal: 14, minHeight: 44, paddingVertical: 8, maxWidth: '100%', alignSelf: 'flex-start', alignItems: 'center', flexDirection: 'row', gap: 8, backgroundColor: colors.accent, borderRadius: 12 },
  actionText: { flexShrink: 1, color: colors.deep, fontWeight: '700' }, pressed: { opacity: 0.78 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexDirection: 'row', flexGrow: 1, alignItems: 'center', gap: 9, borderRadius: 14, backgroundColor: colors.surface, padding: 13, minHeight: 52, borderColor: colors.border, borderWidth: 1 },
  tileText: { flex: 1, fontWeight: '600', color: colors.text, fontSize: 14 },
});
