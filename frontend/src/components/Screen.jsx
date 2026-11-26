import React, { useContext } from 'react';
import { View, ScrollView, Text, StyleSheet, RefreshControl, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderShownContext } from '@react-navigation/elements';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

export default function Screen({ title, subtitle, children, scroll = true, refreshing = false, onRefresh, action }) {
  const hasHeader = useContext(HeaderShownContext);
  const hasTabs = useContext(BottomTabBarHeightContext) != null;
  const edges = ['left', 'right', ...(!hasHeader ? ['top'] : []), ...(!hasTabs ? ['bottom'] : [])];
  const content = <>
    {(title || action || subtitle) && <View style={styles.header}>
      <View style={styles.heading}>{!!title && <Text accessibilityRole="header" style={styles.title}>{title}</Text>}
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>{action}
    </View>}{children}
  </>;
  return <SafeAreaView edges={edges} style={styles.safe}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}>
        {content}</ScrollView> : <View style={styles.content}>{content}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', flexGrow: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 }, heading: { flex: 1, gap: 3 },
  title: { fontSize: 29, color: colors.text, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.muted, fontSize: 15 }
});
