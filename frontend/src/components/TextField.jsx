import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function TextField({ label, error, style, secureTextEntry, prefix, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <View style={[styles.group, style]}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.frame, focused && styles.focus, error && styles.invalid]}>
      {!!prefix && <Text style={styles.prefix}>{prefix}</Text>}
      <TextInput {...props} accessibilityLabel={props.accessibilityLabel || label}
        placeholderTextColor={colors.muted} selectionColor={colors.primary}
        onFocus={e => { setFocused(true); onFocus?.(e); }} onBlur={e => { setFocused(false); onBlur?.(e); }}
        secureTextEntry={secureTextEntry && !visible} style={[styles.input, props.multiline && styles.multiline]} />
      {secureTextEntry && <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        onPress={() => setVisible(!visible)} style={styles.toggle}><Text style={styles.link}>{visible ? 'Hide' : 'Show'}</Text></Pressable>}
    </View>
    {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: 7 }, label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  frame: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#AEBFB5', backgroundColor: colors.surface },
  focus: { borderColor: colors.primary }, invalid: { borderColor: colors.danger },
  input: { flex: 1, minHeight: 50, paddingHorizontal: 13, paddingVertical: 10, fontSize: 16, color: colors.text },
  multiline: { minHeight: 94, textAlignVertical: 'top' }, prefix: { paddingLeft: 14, color: colors.text, fontWeight: '600' },
  toggle: { justifyContent: 'center', minHeight: 48, minWidth: 48, paddingHorizontal: 12 }, link: { color: colors.primary, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13 }
});
