import RecordLink from '../../components/RecordLink';
import TaskSheet from '../../components/TaskSheet';
import { Choices, displayName } from '../../components/Controls';
import { PropertyPicker } from '../../components/Controls';
import React, { useEffect, useState } from 'react';
import { Text, Switch, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Screen,
  Card,
  Button,
  TextField,
  StatusPill,
  LoadingState,
  ErrorState,
  EmptyState,
} from '../../components';
import useProperties from '../../hooks/useProperties';
import { api } from '../../api/client';
import { colors } from '../../theme';
const categories = ['GENERAL', 'FOOD', 'ELECTRICITY', 'WATER', 'MAINTENANCE', 'EMERGENCY'];
const blank = () => ({
  title: '',
  body: '',
  category: 'GENERAL',
  pinned: false,
  publishAt: '',
  expiresAt: '',
});
const toIST = (s) =>
  s ? new Date(Date.parse(s) + 19800000).toISOString().slice(0, 16).replace('T', ' ') : '';
function parseIST(s) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return null;
  const n = Date.parse(s.replace(' ', 'T') + ':00+05:30');
  return Number.isFinite(n) &&
    toIST(n === 0 ? new Date(0).toISOString() : new Date(n).toISOString()) === s
    ? new Date(n).toISOString()
    : null;
}
function status(a) {
  const now = Date.now();
  return a.archivedAt
    ? 'ARCHIVED'
    : Date.parse(a.publishAt) > now
      ? 'SCHEDULED'
      : a.expiresAt && Date.parse(a.expiresAt) <= now
        ? 'EXPIRED'
        : 'PUBLISHED';
}
export default function Announcements({ route }) {
  const resident = useSelector((s) => s.auth.user.role) === 'RESIDENT',
    p = useProperties(route.params?.propertyId),
    id = p.selected,
    base = '/properties/' + id + '/announcements';
  const [noticeId, setNoticeId] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [data, setData] = useState(null),
    [state, setState] = useState('loading'),
    [rev, setRev] = useState(0),
    [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [filter, setFilter] = useState('ALL');
  const reload = () => setRev((n) => n + 1);
  useEffect(() => {
    if (!id) return;
    const c = new AbortController();
    setData(null);
    setState('loading');
    api
      .get(base, { signal: c.signal })
      .then(({ data }) => {
        if (!c.signal.aborted) {
          setData({ id, items: data.items });
          setState('ready');
        }
      })
      .catch(() => {
        if (!c.signal.aborted) setState('error');
      });
    return () => c.abort();
  }, [id, rev]);
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      reload();
    } catch {
      setError('Unable to complete request. Refresh before retrying.');
    } finally {
      setBusy(false);
    }
  }
  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function save() {
    if (resident || !form || form.propertyId !== id) return;
    const start = form.publishAt ? parseIST(form.publishAt) : null,
      end = form.expiresAt ? parseIST(form.expiresAt) : null;
    if (
      !form.title.trim() ||
      !form.body.trim() ||
      (form.publishAt && !start) ||
      (form.expiresAt && !end) ||
      (end && Date.parse(end) <= (start ? Date.parse(start) : Date.now()))
    ) {
      setError('Enter a title, message and valid IST dates. Expiry must follow publishing.');
      return;
    }
    const payload = {
      title: form.title,
      body: form.body,
      category: form.category,
      pinned: form.pinned,
      ...(start ? { publishAt: start } : {}),
      expiresAt: end,
    };
    run(async () => {
      if (form.id) await api.put(base + '/' + form.id, payload);
      else await api.post(base, payload);
      setForm(null);
    });
  }
  const rows = data?.id === id ? data.items : [],
    visible = rows
      .filter(
        (a) =>
          (!resident || status(a) === 'PUBLISHED') &&
          (filter === 'ALL' ||
            (filter === 'UNREAD'
              ? !a.readAt
              : filter === 'ARCHIVED'
                ? !!a.archivedAt
                : a.category === filter))
      )
      .sort(
        (a, b) =>
          Number(!!b.pinned) - Number(!!a.pinned) || Date.parse(b.publishAt) - Date.parse(a.publishAt)
      );
  return (
    <Screen
      eyebrow="Noticeboard"
      title={resident ? 'PG updates' : 'Announcements'}
      refreshing={p.state === 'loading' || (!!id && state === 'loading')}
      onRefresh={() => {
        p.reload();
        reload();
      }}
    >
      {error ? (
        <Text style={{ color: colors.danger }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {p.state === 'loading' ? (
        <LoadingState />
      ) : p.state === 'error' ? (
        <ErrorState onRetry={p.reload} />
      ) : !p.items.length ? (
        <EmptyState title="No accessible PG" />
      ) : (
        <>
          <PropertyPicker
            items={p.items}
            value={p.selected}
            disabled={busy || !!form}
            onChange={(nextId) => {
              p.setSelected(nextId);
              setError('');
            }}
          />
          {!resident && !form ? (
            <Button
              title="Create announcement"
              disabled={busy}
              onPress={() => {
                setError('');
                setScheduling(false);
                setForm({ ...blank(), propertyId: id });
              }}
            />
          ) : null}
          {!resident && form?.propertyId === id ? (
            <TaskSheet
              title={form.id ? 'Edit announcement' : 'New announcement'}
              context={p.items.find((x) => x.id === id)?.name}
              busy={busy}
              message={error}
              onClose={() => setForm(null)}
            >
              <TextField
                label="Title"
                value={form.title}
                maxLength={120}
                editable={!busy}
                onChangeText={(v) => change('title', v)}
              />
              <TextField
                label="Message"
                value={form.body}
                maxLength={4000}
                multiline
                editable={!busy}
                onChangeText={(v) => change('body', v)}
              />
              <Choices
                label="Category"
                options={categories}
                value={form.category}
                disabled={busy}
                onChange={(v) => change('category', v)}
              />
              <Text>Pin announcement</Text>
              <Switch
                accessibilityLabel="Pin announcement"
                value={form.pinned}
                disabled={busy}
                onValueChange={(v) => change('pinned', v)}
              />
              <Button
                title={scheduling ? 'Hide schedule' : 'Publishing schedule'}
                variant="secondary"
                onPress={() => setScheduling((v) => !v)}
              />
              {scheduling && (
                <>
                  <Text>Leave the publishing time blank to publish immediately.</Text>
                  <TextField
                    label="Publish at · India time (optional)"
                    placeholder="YYYY-MM-DD HH:mm"
                    value={form.publishAt}
                    editable={!busy}
                    onChangeText={(v) => change('publishAt', v)}
                  />
                  <TextField
                    label="Expires at · India time (optional)"
                    placeholder="YYYY-MM-DD HH:mm"
                    value={form.expiresAt}
                    editable={!busy}
                    onChangeText={(v) => change('expiresAt', v)}
                  />
                </>
              )}
              <Button
                title={
                  form.id
                    ? 'Save changes'
                    : form.publishAt && Date.parse(parseIST(form.publishAt)) > Date.now()
                      ? 'Schedule announcement'
                      : 'Publish announcement'
                }
                loading={busy}
                onPress={save}
              />
            </TaskSheet>
          ) : null}
          <Choices
            label="Announcements"
            compact
            options={['ALL', ...categories, resident ? 'UNREAD' : 'ARCHIVED']}
            value={filter}
            onChange={setFilter}
          />
          {state === 'error' ? (
            <ErrorState onRetry={reload} />
          ) : data?.id !== id ? (
            <LoadingState />
          ) : !visible.length ? (
            <EmptyState title="No matching announcements" />
          ) : (
            visible.map((a) => (
              <React.Fragment key={a.id}>
                <RecordLink
                  icon={a.pinned ? 'star' : 'bell'}
                  title={a.title}
                  detail={
                    (a.pinned ? 'Pinned · ' : '') +
                    (resident && !a.readAt ? 'Unread · ' : '') +
                    displayName(a.category) +
                    ' · ' +
                    toIST(a.publishAt) +
                    ' IST'
                  }
                  badge={<StatusPill status={a.category === 'EMERGENCY' ? 'URGENT' : status(a)} />}
                  disabled={busy}
                  onPress={() => {
                    setNoticeId(a.id);
                    setError('');
                  }}
                />
                {noticeId === a.id && !form && (
                  <TaskSheet
                    title={a.title}
                    busy={busy}
                    context={p.items.find((x) => x.id === id)?.name}
                    message={error}
                    onClose={() => setNoticeId(null)}
                  >
                    {a.category === 'EMERGENCY' ? <StatusPill status="URGENT" /> : null}
                    {a.pinned ? <Text style={{ color: colors.primary }}>Pinned notice</Text> : null}
                    <Text>
                      {displayName(a.category)} · {toIST(a.publishAt)} IST
                    </Text>
                    <Text>{a.body}</Text>
                    {a.expiresAt ? <Text>Expires: {toIST(a.expiresAt)} IST</Text> : null}
                    {resident ? (
                      <>
                        {a.readAt ? (
                          <Text>Read</Text>
                        ) : (
                          <Button
                            title="Mark as read"
                            disabled={busy}
                            variant="secondary"
                            onPress={() => run(() => api.put(base + '/' + a.id + '/read'))}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <StatusPill status={status(a)} />
                        <Text>
                          Published by: {a.author?.name || 'PG staff'} · {a._count?.reads ?? 0} reads
                        </Text>
                        {!a.archivedAt ? (
                          <>
                            <Button
                              title="Edit announcement"
                              disabled={busy || !!form}
                              variant="secondary"
                              onPress={() => {
                                setNoticeId(null);
                                setScheduling(true);
                                setError('');
                                setForm({
                                  propertyId: id,
                                  id: a.id,
                                  title: a.title,
                                  body: a.body,
                                  category: a.category,
                                  pinned: a.pinned,
                                  publishAt: toIST(a.publishAt),
                                  expiresAt: toIST(a.expiresAt),
                                });
                              }}
                            />
                            <Button
                              title="Archive announcement"
                              disabled={busy || !!form}
                              variant="secondary"
                              onPress={() =>
                                Alert.alert(
                                  'Archive announcement?',
                                  'Residents will no longer see this notice.',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Archive',
                                      style: 'destructive',
                                      onPress: () =>
                                        run(async () => {
                                          await api.delete(base + '/' + a.id);
                                          setNoticeId(null);
                                        }),
                                    },
                                  ]
                                )
                              }
                            />
                          </>
                        ) : null}
                      </>
                    )}
                  </TaskSheet>
                )}
              </React.Fragment>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
