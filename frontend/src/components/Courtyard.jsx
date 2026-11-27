import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { colors, type } from '../theme';

export default function Courtyard({ label, title, detail }) {
  return (
    <View style={styles.panel}>
      <Image
        accessible={false}
        resizeMode="cover"
        style={styles.art}
        source={require('../assets/courtyard.jpg')}
      />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {!!detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { backgroundColor: colors.deep, borderRadius: 18, overflow: 'hidden' },
  art: { width: '100%', aspectRatio: 3.7 },
  copy: { paddingVertical: 15, paddingHorizontal: 20, gap: 4 },
  label: { ...type.caption, color: colors.accent, letterSpacing: 1 },
  title: { ...type.section, color: '#FFFBF2', fontSize: 29 },
  detail: { color: '#E0E5E7', fontSize: 14, lineHeight: 20 },
});
