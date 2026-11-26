import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, type } from '../theme';

export default function TaskSheet({ title, context, onClose, busy = false, message, children }) {
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView style={styles.page}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.fill}
        >
          <View style={styles.header}>
            <View style={styles.heading}>
              {!!context && <Text style={styles.context}>{context}</Text>}
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={'Close ' + title}
              disabled={busy}
              accessibilityState={{ disabled: busy }}
              onPress={onClose}
              style={styles.close}
            >
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>
          {!!message && (
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {message}
            </Text>
          )}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: { flex: 1, gap: 3 },
  title: { ...type.section, color: colors.text },
  context: { ...type.caption, color: colors.brass },
  close: {
    minWidth: 52,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    backgroundColor: colors.soft,
    borderRadius: 22,
  },
  closeLabel: { fontWeight: '700', color: colors.primary },
  body: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 18, paddingBottom: 32, gap: 14 },
  message: { color: colors.text, backgroundColor: '#FFF0CF', padding: 12, fontSize: 15 },
});
