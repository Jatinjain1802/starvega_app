import RecordLink from '../../components/RecordLink';
import TaskSheet from '../../components/TaskSheet';
import { PropertyPicker, Choices, displayName } from '../../components/Controls';
import React, { useEffect, useState } from 'react';
import { Text, Switch, View } from 'react-native';
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
const categories = [
  'FOOD',
  'WATER',
  'ELECTRICITY',
  'CLEANING',
  'INTERNET',
  'MAINTENANCE',
  'SECURITY',
  'OTHER',
];
const blank = () => ({
  title: '',
  description: '',
  category: 'OTHER',
  visibility: 'COMMON',
  safety: false,
});
export default function Complaints({ route, navigation }) {
  const resident = useSelector((s) => s.auth.user.role) === 'RESIDENT',
    p = useProperties(route.params?.propertyId),
    id = p.selected,
    base = '/properties/' + id + '/complaints';
  const [data, setData] = useState(null),
    [state, setState] = useState('loading'),
    [rev, setRev] = useState(0),
    [form, setForm] = useState(null),
    [detail, setDetail] = useState(null),
    [note, setNote] = useState(''),
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
    } catch (e) {
      setError(
        e.response?.status === 409
          ? 'Complaint changed. Refresh and try again.'
          : 'Unable to complete request. Refresh before retrying.'
      );
    } finally {
      setBusy(false);
    }
  }
  const linkedId = route.params?.complaintId;
  useEffect(() => {
    if (!linkedId || id !== route.params?.propertyId) return;
    const c = new AbortController();
    api
      .get(base + '/' + linkedId, { signal: c.signal })
      .then(({ data }) => {
        if (c.signal.aborted) return;
        setDetail({ propertyId: id, ...data.complaint });
        setNote('');
        setError('');
        navigation.setParams({ complaintId: undefined });
      })
      .catch(() => {
        if (!c.signal.aborted) {
          setError('Unable to open this complaint.');
          navigation.setParams({ complaintId: undefined });
        }
      });
    return () => c.abort();
  }, [base, id, linkedId, route.params?.propertyId, navigation]);
  async function open(c) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get(base + '/' + c.id);
      setDetail({ propertyId: id, ...data.complaint });
      setNote('');
    } catch {
      setError('Unable to load complaint history.');
    } finally {
      setBusy(false);
    }
  }
  function submit() {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Enter a title and description.');
      return;
    }
    run(async () => {
      await api.post(base, form);
      setForm(null);
    });
  }
  function change(status) {
    if (!note.trim()) {
      setError('Enter a status update note.');
      return;
    }
    run(async () => {
      await api.patch(base + '/' + detail.id + '/status', { status, note });
      setDetail(null);
      setNote('');
    });
  }
  const rows = data?.id === id ? data.items : [],
    shown = rows
      .filter(
        (c) =>
          filter === 'ALL' ||
          (filter === 'SAFETY'
            ? c.safety
            : filter === 'MINE'
              ? c.isMine
              : filter === 'UNRESOLVED'
                ? c.status !== 'RESOLVED'
                : c.visibility === filter)
      )
      .sort(
        (a, b) =>
          Number(b.safety && b.status !== 'RESOLVED') - Number(a.safety && a.status !== 'RESOLVED') ||
          Number(a.status === 'RESOLVED') - Number(b.status === 'RESOLVED') ||
          b._count.likes - a._count.likes ||
          new Date(b.createdAt) - new Date(a.createdAt)
      );
  const current = detail?.propertyId === id ? detail : null;
  return (
    <Screen
      title="Complaints"
      refreshing={p.state === 'loading' || (!!id && state === 'loading')}
      onRefresh={() => {
        p.reload();
        reload();
        setDetail(null);
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
            disabled={busy}
            onChange={(nextId) => {
              p.setSelected(nextId);
              setForm(null);
              setDetail(null);
              setError('');
            }}
          />
          {resident ? (
            <Button
              title="Raise complaint"
              disabled={busy}
              onPress={() => {
                setForm(blank());
                setDetail(null);
                setError('');
              }}
            />
          ) : null}
          {form ? (
            <TaskSheet
              title="Raise complaint"
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
                onChangeText={(title) => setForm((f) => ({ ...f, title }))}
              />
              <TextField
                label="Description"
                multiline
                value={form.description}
                maxLength={3000}
                editable={!busy}
                onChangeText={(description) => setForm((f) => ({ ...f, description }))}
              />
              <Choices
                label="Category"
                options={categories}
                value={form.category}
                disabled={busy}
                onChange={(category) => setForm((f) => ({ ...f, category }))}
              />
              <Choices
                label="Who can see this?"
                options={[
                  ['COMMON', 'Everyone in this PG'],
                  ['PRIVATE', 'You and PG staff'],
                ]}
                value={form.visibility}
                disabled={busy}
                onChange={(visibility) => setForm((f) => ({ ...f, visibility }))}
              />
              <View
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text>Urgent safety concern</Text>
                <Switch
                  accessibilityLabel="Urgent safety concern"
                  value={form.safety}
                  disabled={busy}
                  onValueChange={(safety) => setForm((f) => ({ ...f, safety }))}
                />
              </View>
              {form.safety ? (
                <Text style={{ color: colors.danger }}>
                  If there is immediate danger, contact emergency services or PG staff directly.
                </Text>
              ) : null}
              <Button title="Submit complaint" loading={busy} onPress={submit} />
            </TaskSheet>
          ) : null}
          {current ? (
            <TaskSheet
              title={current.title}
              context={p.items.find((x) => x.id === id)?.name}
              busy={busy}
              message={error}
              onClose={() => setDetail(null)}
            >
              <Text>{current.description}</Text>
              <StatusPill status={current.status} />
              {current.safety ? <StatusPill status="URGENT" /> : null}
              <Text accessibilityRole="header" style={{ fontWeight: '700' }}>
                Status history
              </Text>
              {current.events.map((e, i) => (
                <Card key={i}>
                  <StatusPill status={e.status} />
                  <Text>{new Date(e.createdAt).toLocaleString()}</Text>
                  {e.note ? <Text>{e.note}</Text> : null}
                </Card>
              ))}
              {(!resident || current.isMine) && (!resident || current.status === 'RESOLVED') ? (
                <>
                  <TextField
                    label="Update note"
                    multiline
                    value={note}
                    maxLength={1000}
                    editable={!busy}
                    onChangeText={setNote}
                  />
                  {current.status === 'RESOLVED' ? (
                    <Button
                      title="Reopen complaint"
                      disabled={busy}
                      onPress={() => change('REOPENED')}
                    />
                  ) : !resident ? (
                    <>
                      {['OPEN', 'REOPENED'].includes(current.status) ? (
                        <Button
                          title="Mark in progress"
                          disabled={busy}
                          onPress={() => change('IN_PROGRESS')}
                        />
                      ) : null}
                      <Button title="Mark resolved" disabled={busy} onPress={() => change('RESOLVED')} />
                    </>
                  ) : null}
                </>
              ) : null}
            </TaskSheet>
          ) : null}
          <Choices
            compact
            label="Complaints"
            options={['ALL', 'UNRESOLVED', 'SAFETY', 'COMMON', 'PRIVATE', ...(resident ? ['MINE'] : [])]}
            value={filter}
            onChange={setFilter}
          />
          {state === 'error' ? (
            <ErrorState onRetry={reload} />
          ) : data?.id !== id ? (
            <LoadingState />
          ) : !shown.length ? (
            <EmptyState title="No matching complaints" />
          ) : (
            shown.map((c) =>
              !resident ? (
                <RecordLink
                  key={c.id}
                  icon="chat"
                  title={c.title}
                  detail={[displayName(c.category), c.resident?.name].filter(Boolean).join(' · ')}
                  badge={
                    <StatusPill status={c.safety && c.status !== 'RESOLVED' ? 'URGENT' : c.status} />
                  }
                  disabled={busy}
                  onPress={() => open(c)}
                />
              ) : (
                <Card key={c.id}>
                  {c.safety && c.status !== 'RESOLVED' ? <StatusPill status="URGENT" /> : null}
                  <Text style={{ fontSize: 17, fontWeight: '700' }}>{c.title}</Text>
                  <Text>
                    {displayName(c.category)} · {displayName(c.visibility)}
                  </Text>
                  {c.resident ? <Text>Reported by: {c.resident.name}</Text> : null}
                  <Text numberOfLines={3}>{c.description}</Text>
                  <StatusPill status={c.status} />
                  {c.visibility === 'COMMON' ? (
                    <>
                      <Text>{c._count.likes} likes</Text>
                      {resident ? (
                        <Button
                          title={c.likedByMe ? 'Remove like' : 'Like complaint'}
                          variant="secondary"
                          disabled={busy}
                          onPress={() =>
                            run(async () => {
                              await api[c.likedByMe ? 'delete' : 'put'](base + '/' + c.id + '/like');
                              setDetail(null);
                            })
                          }
                        />
                      ) : null}
                    </>
                  ) : null}
                  <Button
                    title="Open complaint"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => open(c)}
                  />
                </Card>
              )
            )
          )}
        </>
      )}
    </Screen>
  );
}
