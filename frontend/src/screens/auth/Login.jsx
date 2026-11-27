import Courtyard from '../../components/Courtyard';
import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen, Card, TextField, Button } from '../../components';
import { colors } from '../../theme';
import { login } from '../../services/auth';
export default function Login({ onInvite }) {
  const [attempted, setAttempted] = useState(false);
  const [phone, setPhone] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit() {
    if (busy) return;
    setAttempted(true);
    if (!/^[6-9]\d{9}$/.test(phone) || !password) {
      setError('');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login('+91' + phone, password);
    } catch (e) {
      setError(
        e.response?.status === 401
          ? 'Incorrect mobile number or password.'
          : 'Unable to sign in. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Courtyard label="STARVEGA PG" title="Welcome back" />
      <Card>
        <TextField
          label="Mobile number"
          prefix="+91"
          autoComplete="tel-national"
          error={
            attempted && !/^[6-9]\d{9}$/.test(phone)
              ? 'Enter a 10-digit Indian mobile number.'
              : undefined
          }
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={10}
          editable={!busy}
        />
        <TextField
          label="Password"
          autoComplete="current-password"
          error={attempted && !password ? 'Enter your password.' : undefined}
          returnKeyType="go"
          onSubmitEditing={submit}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!busy}
          autoCapitalize="none"
        />
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button title="Sign in" loading={busy} onPress={submit} />
      </Card>
      <Button title="Accept invitation" variant="secondary" disabled={busy} onPress={onInvite} />
    </Screen>
  );
}
const styles = StyleSheet.create({ error: { color: colors.danger } });
