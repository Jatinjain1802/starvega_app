import { Section } from '../owner/Overview';
import { Choices } from '../../components/Controls';
import React, { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Card, Button, LoadingState, ErrorState, EmptyState } from '../../components';
import { colors } from '../../theme';
import { api } from '../../api/client';
export default function Notifications() {
  const [rows, setRows] = useState([]),
    [cursor, setCursor] = useState(null),
    [unread, setUnread] = useState(0),
    [state, setState] = useState('loading'),
    [filter, setFilter] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const request = useRef(null),
    active = useRef(false),
    locked = useRef(false);
  const load = useCallback(async (next = null) => {
    request.current?.abort();
    const c = new AbortController();
    request.current = c;
    setState(next ? 'more' : 'loading');
    setError('');
    try {
      const { data } = await api.get('/notifications', {
        params: next ? { cursor: next } : {},
        signal: c.signal,
      });
      if (c.signal.aborted || !active.current) return;
      setRows((old) =>
        next ? [...new Map([...old, ...data.items].map((x) => [x.id, x])).values()] : data.items
      );
      setCursor(data.nextCursor);
      setUnread(data.unread);
      setState('ready');
    } catch {
      if (!c.signal.aborted && active.current) {
        setState(next ? 'ready' : 'error');
        setError('Unable to load notifications.');
      }
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      load();
      return () => {
        active.current = false;
        request.current?.abort();
      };
    }, [load])
  );
  async function mark(id) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await api.put(id ? '/notifications/' + id + '/read' : '/notifications/read-all');
      if (active.current) await load();
    } catch {
      if (active.current) setError('Unable to update read status. Please retry.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const visible = rows.filter((n) => !filter || !n.readAt);
  return (
    <Screen
      title="Notifications"
      subtitle={unread + ' unread'}
      refreshing={state === 'loading'}
      onRefresh={() => {
        if (!busy) load();
      }}
    >
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <Choices
        label="Inbox"
        options={[
          [false, 'All messages'],
          [true, 'Unread'],
        ]}
        value={filter}
        onChange={setFilter}
      />
      {unread > 0 && (
        <Button
          title="Mark all as read"
          variant="secondary"
          disabled={busy || state !== 'ready'}
          onPress={() => mark(null)}
        />
      )}
      {state === 'loading' ? (
        <LoadingState />
      ) : state === 'error' ? (
        <ErrorState onRetry={() => load()} />
      ) : (
        <>
          {!visible.length ? (
            <EmptyState
              title={filter ? 'No unread messages on this page' : 'No notifications yet'}
              message={filter && cursor ? 'Load older messages to continue.' : undefined}
            />
          ) : (
            visible.map((n, i) => (
              <React.Fragment key={n.id}>
                {(i === 0 ||
                  new Date(visible[i - 1].createdAt).toDateString() !==
                    new Date(n.createdAt).toDateString()) && (
                  <Section>
                    {new Date(n.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Section>
                )}
                <Card style={!n.readAt && { borderLeftWidth: 3, borderLeftColor: colors.brass }}>
                  <Text style={{ fontWeight: n.readAt ? '500' : '700', color: colors.text }}>
                    {n.title}
                  </Text>
                  <Text>{n.body}</Text>
                  <Text style={{ color: colors.muted }}>
                    {new Date(n.createdAt).toLocaleTimeString('en-IN', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                  {n.readAt ? (
                    <Text>Read</Text>
                  ) : (
                    <Button
                      title="Mark as read"
                      variant="secondary"
                      disabled={busy || state === 'more'}
                      onPress={() => mark(n.id)}
                    />
                  )}
                </Card>
              </React.Fragment>
            ))
          )}
          {cursor ? (
            <Button
              title="Load older messages"
              variant="secondary"
              loading={state === 'more'}
              disabled={busy}
              onPress={() => load(cursor)}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
