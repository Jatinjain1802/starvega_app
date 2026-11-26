import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from './Button';
import { colors } from '../theme';

export function LoadingState({ message = 'Loading…' }) {
  return <View accessible accessibilityLabel={message} accessibilityRole="progressbar" accessibilityLiveRegion="polite" style={styles.panel}>
    <Text style={styles.caption}>{message}</Text>
    <View style={styles.line}/><View style={[styles.line, {width: '58%'}]}/>
  </View>;
}

export function EmptyState({ title = 'Nothing here yet', message, actionLabel, onAction }) {
  return <View style={styles.panel}><Text style={styles.title}>{title}</Text>
    {!!message && <Text style={styles.caption}>{message}</Text>}
    {!!onAction && !!actionLabel && <Button title={actionLabel} variant="secondary" onPress={onAction}/>}
  </View>;
}
export function ErrorState({ message = 'Check your connection and try again.', onRetry }) {
  return <EmptyState title="Unable to load" message={message} actionLabel="Try again" onAction={onRetry}/>;
}
const styles = StyleSheet.create({
  panel: { padding: 20, gap: 10, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' }, caption: { color: colors.muted, fontSize: 14 },
  line: { width: '85%', height: 12, borderRadius: 6, backgroundColor: colors.soft }
});
