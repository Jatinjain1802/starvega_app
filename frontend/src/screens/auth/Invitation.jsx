import React, { useState } from 'react';
import { Text } from 'react-native';
import { Screen, Card, TextField, Button } from '../../components';
import { acceptInvitation } from '../../services/auth';
import { colors } from '../../theme';
export default function Invitation({ onBack }) {
  const [step, setStep] = useState(1),
    [attempted, setAttempted] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', token: '', password: '' }),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const field = (k) => ({
    value: form[k],
    onChangeText: (v) => setForm((old) => ({ ...old, [k]: v })),
    editable: !busy,
  });
  const errors = {
    name: !form.name.trim() ? 'Enter your full name.' : '',
    phone: !/^[6-9]\d{9}$/.test(form.phone) ? 'Enter a 10-digit Indian mobile number.' : '',
    token: !/^[a-f0-9]{64}$/.test(form.token.trim())
      ? 'Paste the full invitation code from your PG staff.'
      : '',
    password: form.password.length < 12 ? 'Use at least 12 characters.' : '',
  };
  function next() {
    setAttempted(true);
    if (errors.phone || errors.token) return;
    setMessage('');
    setAttempted(false);
    setStep(2);
  }
  async function submit() {
    if (busy) return;
    setAttempted(true);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    setMessage('');
    try {
      await acceptInvitation({
        ...form,
        name: form.name.trim(),
        phone: '+91' + form.phone,
        token: form.token.trim(),
      });
      onBack();
    } catch {
      setMessage('Unable to accept invitation. Check the code or contact your PG staff.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      eyebrow={'Account setup · ' + step + ' of 2'}
      title={step === 1 ? 'Accept invitation' : 'Create your account'}
      subtitle={
        step === 1
          ? 'Use the mobile number your invitation was sent to.'
          : 'Choose the name and password for your account.'
      }
    >
      <Card>
        {step === 1 ? (
          <>
            <TextField
              label="Mobile number"
              prefix="+91"
              keyboardType="phone-pad"
              autoComplete="tel-national"
              maxLength={10}
              {...field('phone')}
              error={attempted && errors.phone}
            />
            <TextField
              label="Invitation code"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              {...field('token')}
              error={attempted && errors.token}
            />
            <Button title="Continue" onPress={next} />
          </>
        ) : (
          <>
            <TextField
              label="Full name"
              maxLength={120}
              autoComplete="name"
              {...field('name')}
              error={attempted && errors.name}
            />
            <TextField
              label="Create password"
              autoComplete="new-password"
              maxLength={128}
              placeholder="At least 12 characters"
              secureTextEntry
              {...field('password')}
              error={attempted && errors.password}
            />
            {!!message && (
              <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
                {message}
              </Text>
            )}
            <Button title="Create account" loading={busy} onPress={submit} />
          </>
        )}
      </Card>
      <Button
        title={step === 1 ? 'Back to sign in' : 'Back to invitation'}
        variant="secondary"
        disabled={busy}
        onPress={() => {
          if (step === 1) return onBack();
          setMessage('');
          setAttempted(false);
          setStep(1);
        }}
      />
    </Screen>
  );
}
