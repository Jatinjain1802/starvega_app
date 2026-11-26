import React from 'react';
import { Image, Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, type } from '../../theme';
import Icon from './Icon';

export function Section({ children }) {
  return (
    <Text accessibilityRole="header" style={styles.section}>
      {children}
    </Text>
  );
}

export function NotificationButton({ onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open notifications"
      style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Icon name="bell" size={20} />
    </Pressable>
  );
}

export function Highlight({ label, value, detail, action, onPress, metrics }) {
  return (
    <View style={styles.panel}>
      <View style={styles.hero}>
        <View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.art}
        >
          <Image
            source={require('./arcade.png')}
            accessible={false}
            resizeMode="contain"
            style={styles.illustration}
          />
        </View>
        <Text style={styles.heroLabel}>{label}</Text>
        <Text style={styles.amount}>{value}</Text>
        {!!detail && <Text style={styles.detail}>{detail}</Text>}
        {!!action && (
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>{action}</Text>
            <Icon name="arrow" size={14} color={colors.deep} />
          </Pressable>
        )}
      </View>
      {!!metrics?.length && (
        <View style={styles.metrics}>
          {metrics.map(([name, figure]) => (
            <View key={name} style={styles.metric}>
              <Text style={styles.metricLabel}>{name}</Text>
              <Text style={styles.metricValue}>{figure}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function Shortcuts({ items, onSelect }) {
  const { width, fontScale } = useWindowDimensions();
  const compact = items.length === 4 && width >= 370 && fontScale <= 1.12;
  const basis = compact ? '22%' : width < 340 || fontScale > 1.5 ? '100%' : '46%';
  return (
    <View style={styles.grid}>
      {items.map(([name, label, icon]) => (
        <Pressable
          key={name}
          accessibilityRole="button"
          onPress={() => onSelect(name)}
          style={({ pressed }) => [
            styles.tile,
            { flexBasis: basis },
            compact ? styles.vertical : styles.horizontal,
            pressed && styles.tilePressed,
          ]}
        >
          <View style={styles.iconBox}>
            <Icon name={icon} size={19} color={colors.brass} />
          </View>
          <Text style={[styles.tileText, compact && styles.center]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...type.section, color: colors.text, marginTop: 4 },
  bell: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  panel: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hero: {
    backgroundColor: colors.deep,
    paddingHorizontal: 22,
    paddingVertical: 20,
    gap: 5,
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    right: -10,
    top: 0,
    bottom: 0,
    width: '44%',
    opacity: 0.8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  illustration: { width: '100%', height: '100%' },
  heroLabel: { ...type.caption, color: colors.accent },
  amount: { ...type.amount, color: '#FFFBF2', fontSize: 43, letterSpacing: -1 },
  detail: { color: '#E0E3E6', fontSize: 14 },
  heroAction: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  actionText: { color: colors.deep, fontWeight: '700', flexShrink: 1 },
  pressed: { opacity: 0.8 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    paddingHorizontal: 18,
    paddingVertical: 15,
    columnGap: 12,
  },
  metric: { flexGrow: 1, flexBasis: 120, gap: 3 },
  metricLabel: { color: colors.muted, fontSize: 13 },
  metricValue: { ...type.amount, fontSize: 23, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tile: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    gap: 8,
  },
  vertical: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  horizontal: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  iconBox: { backgroundColor: colors.soft, borderRadius: 10, padding: 8 },
  tileText: { fontWeight: '600', fontSize: 14, color: colors.text, flexShrink: 1 },
  center: { textAlign: 'center', fontSize: 13 },
  tilePressed: { backgroundColor: colors.soft },
});
