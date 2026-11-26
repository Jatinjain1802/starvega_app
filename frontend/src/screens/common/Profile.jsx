import TaskSheet from '../../components/TaskSheet';
import RecordLink from '../../components/RecordLink';
import { displayName } from '../../components/Controls';
import React, { useState, useCallback, useRef } from 'react';
import { Text, Alert, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Card, Button, TextField, LoadingState, ErrorState, EmptyState } from '../../components';
import { api } from '../../api/client';
import { logout } from '../../services/auth';
export function ManagerContact() {
  const [state, setState] = useState({ loading: true }),
    [rev, setRev] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const c = new AbortController();
      setState({ loading: true });
      api
        .get('/resident/dashboard', { signal: c.signal })
        .then(({ data }) => {
          if (!c.signal.aborted) setState({ data });
        })
        .catch(() => {
          if (!c.signal.aborted) setState({ error: true });
        });
      return () => c.abort();
    }, [rev])
  );
  const pg = state.data?.allocation?.bed?.room?.property;
  async function contact(phone, whatsapp) {
    if (!/^\+91[6-9]\d{9}$/.test(phone)) return Alert.alert('Contact unavailable');
    try {
      await Linking.openURL(whatsapp ? 'https://wa.me/' + phone.slice(1) : 'tel:' + phone);
    } catch {
      Alert.alert('Unable to open contact');
    }
  }
  return (
    <Screen title="Manager contact" refreshing={!!state.loading} onRefresh={() => setRev((n) => n + 1)}>
      {state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState onRetry={() => setRev((n) => n + 1)} />
      ) : !pg?.managers?.length ? (
        <EmptyState title="No assigned manager available" />
      ) : (
        <>
          <Card>
            <Text>{pg.name}</Text>
            <Text>{pg.address}</Text>
          </Card>
          {pg.managers.map(({ manager: m }) => (
            <Card key={m.id}>
              <Text>{m.name}</Text>
              <Text>{m.phone}</Text>
              <Button title="Call manager" onPress={() => contact(m.phone, false)} />
              <Button title="WhatsApp" variant="secondary" onPress={() => contact(m.phone, true)} />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
export default function Profile({ navigation }) {
  const user = useSelector((s) => s.auth.user),
    [editing, setEditing] = useState(false),
    [current, setCurrent] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  function clear() {
    setCurrent('');
    setPassword('');
    setConfirm('');
    setEditing(false);
  }
  async function signOut() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await logout();
    } catch {
      setError('Unable to finish local session cleanup.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function change() {
    if (lock.current) return;
    if (
      !current ||
      password.length < 12 ||
      password.length > 128 ||
      password === current ||
      password !== confirm
    ) {
      setError('Use a different password of 12–128 characters and confirm it.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/password', { currentPassword: current, newPassword: password });
      clear();
      await logout();
      Alert.alert('Password changed', 'Sign in again with your new password.');
    } catch (e) {
      setError(
        e.response?.status === 403
          ? 'Current password is incorrect.'
          : 'Unable to confirm password change. If the session ended, try signing in again.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen title="Profile and settings">
      <Card>
        <Text style={{ fontWeight: '700', fontSize: 20 }}>{user.name}</Text>
        <Text>{user.phone}</Text>
        <Text>{displayName(user.role)}</Text>
      </Card>
      {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      {editing ? (
        <TaskSheet
          title="Change password"
          context="Account security"
          busy={busy}
          message={error}
          onClose={() => {
            clear();
            setError('');
          }}
        >
          <TextField
            label="Current password"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoCapitalize="none"
            maxLength={128}
            editable={!busy}
          />
          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            maxLength={128}
            editable={!busy}
          />
          <TextField
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
            maxLength={128}
            editable={!busy}
          />
          <Text>Changing your password revokes all existing sessions.</Text>
          <Button title="Change password" loading={busy} onPress={change} />
        </TaskSheet>
      ) : (
        <RecordLink
          icon="user"
          title="Change password"
          detail="Account security"
          disabled={busy}
          onPress={() => {
            setError('');
            setEditing(true);
          }}
        />
      )}
      <RecordLink
        icon="bell"
        title="Notification inbox"
        disabled={busy}
        onPress={() => navigation.navigate('Notifications')}
      />
      {user.role === 'RESIDENT' ? (
        <Button
          title="Manager contact"
          variant="secondary"
          disabled={busy}
          onPress={() => navigation.navigate('ManagerContact')}
        />
      ) : null}
      <Button
        title="Sign out"
        variant="secondary"
        disabled={busy}
        onPress={() =>
          Alert.alert('Sign out?', 'You will need to sign in again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', onPress: signOut },
          ])
        }
      />
    </Screen>
  );
}
