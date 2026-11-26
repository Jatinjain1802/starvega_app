import TaskSheet from '../../components/TaskSheet';
import RecordLink from '../../components/RecordLink';
import { PropertyPicker } from '../../components/Controls';
import React, { useEffect, useState } from 'react';
import { Text, Alert, Share } from 'react-native';
import { useSelector } from 'react-redux';
import { Screen, Card, Button, TextField, LoadingState, ErrorState, EmptyState } from '../../components';
import useProperties from '../../hooks/useProperties';
import { api } from '../../api/client';
export default function People({ route }) {
  const managers = route.name === 'Managers',
    owner = useSelector((s) => s.auth.user.role) === 'OWNER';
  const p = useProperties(route.params?.propertyId),
    id = p.selected;
  const [data, setData] = useState(null),
    [state, setState] = useState('loading'),
    [revision, setRevision] = useState(0),
    [mode, setMode] = useState(null),
    [phone, setPhone] = useState(''),
    [bed, setBed] = useState(null),
    [target, setTarget] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [invite, setInvite] = useState(null),
    [history, setHistory] = useState(null),
    [search, setSearch] = useState('');
  const [personId, setPersonId] = useState(null);
  const base = '/properties/' + id + '/people';
  const reload = () => setRevision((n) => n + 1);
  function reset() {
    setPersonId(null);
    setMode(null);
    setPhone('');
    setBed(null);
    setTarget(null);
    setError('');
    setInvite(null);
    setHistory(null);
  }
  useEffect(() => {
    if (!id) return;
    const c = new AbortController();
    setData(null);
    setState('loading');
    (async () => {
      const { data: people } = await api.get(base + (managers ? '/managers' : '/residents'), {
        signal: c.signal,
      });
      let beds = [],
        candidates = [];
      if (!managers) {
        const { data: rooms } = await api.get('/properties/' + id + '/rooms', { signal: c.signal });
        beds = rooms.items.flatMap((r) =>
          r.beds.filter((b) => !b.occupied).map((b) => ({ ...b, room: r.label }))
        );
      } else if (owner) {
        const others = await Promise.all(
          p.items
            .filter((x) => x.id !== id)
            .map((x) => api.get('/properties/' + x.id + '/people/managers', { signal: c.signal }))
        );
        candidates = [
          ...new Map(others.flatMap((x) => x.data.items).map((m) => [m.id, m])).values(),
        ].filter((m) => !people.items.some((x) => x.id === m.id));
      }
      if (!c.signal.aborted) {
        setData({ id, items: people.items, beds, candidates });
        setState('ready');
      }
    })().catch(() => {
      if (!c.signal.aborted) setState('error');
    });
    return () => c.abort();
  }, [id, revision, managers, owner, p.items]);
  async function mutate(fn) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      reload();
    } catch (e) {
      setError(
        e.response?.data?.error === 'BED_UNAVAILABLE'
          ? 'Bed is no longer available. Refresh and choose another.'
          : 'Unable to complete action. Refresh before retrying.'
      );
    } finally {
      setBusy(false);
    }
  }
  function issue() {
    if (!/^[6-9]\d{9}$/.test(phone) || (!managers && !bed)) {
      setError('Enter a valid mobile number and select a vacant bed if required.');
      return;
    }
    mutate(async () => {
      const { data } = await api.post(base + '/invitations', {
        phone: '+91' + phone,
        role: managers ? 'MANAGER' : 'RESIDENT',
        ...(managers ? {} : { bedId: bed }),
      });
      setInvite(data);
      setMode(null);
      setPhone('');
      setBed(null);
    });
  }
  function confirm(title, message, fn) {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: () => mutate(fn) },
    ]);
  }
  async function showHistory(person) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      let cursor = null,
        items = [];
      do {
        const { data } = await api.get(base + '/residents/' + person.resident.id + '/allocations', {
          params: cursor ? { cursor } : {},
        });
        items.push(...data.items);
        cursor = data.nextCursor;
      } while (cursor);
      setPersonId(null);
      setHistory({ name: person.resident.name, items });
    } catch {
      setError('Unable to load allocation history.');
    } finally {
      setBusy(false);
    }
  }
  const d = data?.id === id ? data : null;
  const query = search.trim().toLowerCase();
  const matches = (d?.items || []).filter((row) => {
    const person = managers ? row : row.resident;
    return [person.name, person.phone, row.bed?.room?.label, row.bed?.label]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  return (
    <Screen
      title={managers ? 'Managers' : 'Residents'}
      onRefresh={() => {
        p.reload();
        reload();
      }}
      refreshing={p.state === 'loading' || (!!id && state === 'loading')}
    >
      {p.state === 'loading' ? (
        <LoadingState />
      ) : p.state === 'error' ? (
        <ErrorState onRetry={p.reload} />
      ) : !p.items.length ? (
        <EmptyState title="No properties available" />
      ) : (
        <>
          <PropertyPicker
            items={p.items}
            value={p.selected}
            disabled={busy}
            onChange={(nextId) => {
              reset();
              p.setSelected(nextId);
            }}
          />
          {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
          {state === 'error' ? (
            <ErrorState onRetry={reload} />
          ) : !d ? (
            <LoadingState />
          ) : (
            <>
              {!managers || owner ? (
                <Button
                  title={managers ? 'Invite manager' : 'Invite resident'}
                  disabled={busy}
                  onPress={() => {
                    reset();
                    setMode('invite');
                  }}
                />
              ) : null}
              {managers && owner ? (
                <Button
                  title="Assign existing manager"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    reset();
                    setMode('assign');
                  }}
                />
              ) : null}
              {mode === 'invite' ? (
                <TaskSheet
                  title={managers ? 'Invite manager' : 'Invite resident'}
                  context={p.items.find((x) => x.id === id)?.name}
                  busy={busy}
                  message={error}
                  onClose={reset}
                >
                  <TextField
                    label="Mobile number"
                    prefix="+91"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!busy}
                  />
                  {!managers ? (
                    <>
                      <Text>Choose vacant bed</Text>
                      {d.beds.length ? (
                        d.beds.map((b) => (
                          <Button
                            key={b.id}
                            title={'Room ' + b.room + ' · Bed ' + b.label}
                            variant={bed === b.id ? 'primary' : 'secondary'}
                            disabled={busy}
                            onPress={() => setBed(b.id)}
                          />
                        ))
                      ) : (
                        <Text>No vacant beds.</Text>
                      )}
                    </>
                  ) : null}
                  <Button title="Generate invitation" loading={busy} onPress={issue} />
                </TaskSheet>
              ) : null}
              {invite ? (
                <TaskSheet
                  title="Invitation ready"
                  context={p.items.find((x) => x.id === id)?.name}
                  busy={busy}
                  message={error}
                  onClose={() => setInvite(null)}
                >
                  <Text>
                    Invitation expires: {new Date(invite.invitation.expiresAt).toLocaleString()}
                  </Text>
                  <Text selectable>{invite.token}</Text>
                  <Text>
                    Share privately with the intended recipient. A bed is not reserved until acceptance.
                  </Text>
                  <Button
                    title="Share invitation code"
                    onPress={() =>
                      Share.share({ message: 'Starvega PG invitation code: ' + invite.token }).catch(
                        () => Alert.alert('Unable to share', 'Use the displayed code.')
                      )
                    }
                  />
                </TaskSheet>
              ) : null}
              {mode === 'assign' ? (
                <TaskSheet
                  title="Assign existing manager"
                  context={p.items.find((x) => x.id === id)?.name}
                  busy={busy}
                  message={error}
                  onClose={reset}
                >
                  <Text>Managers assigned to your other PGs</Text>
                  {d.candidates.length ? (
                    d.candidates.map((m) => (
                      <Button
                        key={m.id}
                        title={m.name + ' · ' + m.phone}
                        disabled={busy}
                        onPress={() =>
                          mutate(async () => {
                            await api.post(base + '/managers', { managerId: m.id });
                            reset();
                          })
                        }
                      />
                    ))
                  ) : (
                    <Text>No eligible managers found.</Text>
                  )}
                </TaskSheet>
              ) : null}
              {mode === 'transfer' && target ? (
                <TaskSheet
                  title="Transfer resident"
                  context={p.items.find((x) => x.id === id)?.name}
                  busy={busy}
                  message={error}
                  onClose={reset}
                >
                  <Text>Choose a vacant bed for {target.resident.name}.</Text>
                  {!d.beds.length && (
                    <EmptyState
                      title="No vacant beds"
                      message="A bed must be available before a transfer."
                    />
                  )}
                  {d.beds.map((b) => (
                    <Button
                      key={b.id}
                      title={'Room ' + b.room + ' · Bed ' + b.label}
                      variant={bed === b.id ? 'primary' : 'secondary'}
                      disabled={busy}
                      onPress={() => setBed(b.id)}
                    />
                  ))}
                  <Button
                    title="Confirm transfer"
                    disabled={!bed || !d.beds.length}
                    loading={busy}
                    onPress={() =>
                      mutate(async () => {
                        await api.post(base + '/allocations/' + target.id + '/transfer', { bedId: bed });
                        reset();
                      })
                    }
                  />
                </TaskSheet>
              ) : null}
              {history ? (
                <TaskSheet
                  title="Allocation history"
                  context={p.items.find((x) => x.id === id)?.name}
                  busy={busy}
                  message={error}
                  onClose={() => setHistory(null)}
                >
                  <Text>Allocation history: {history.name}</Text>
                  {history.items.map((h) => (
                    <Text key={h.id}>
                      Room {h.bed.room.label}, bed {h.bed.label} ·{' '}
                      {new Date(h.startedAt).toLocaleDateString()} –{' '}
                      {h.endedAt ? new Date(h.endedAt).toLocaleDateString() : 'Current'}
                    </Text>
                  ))}
                </TaskSheet>
              ) : null}
              <TextField
                label={managers ? 'Search managers' : 'Search residents'}
                placeholder={managers ? 'Name or mobile number' : 'Name, mobile, room or bed'}
                returnKeyType="search"
                value={search}
                onChangeText={setSearch}
              />
              {matches.map((x) => {
                const m = managers ? x : x.resident;
                return (
                  <RecordLink
                    key={x.id}
                    title={m.name}
                    icon={managers ? 'user' : 'people'}
                    detail={managers ? m.phone : 'Room ' + x.bed.room.label + ' · Bed ' + x.bed.label}
                    onPress={() => {
                      setError('');
                      setPersonId(x.id);
                    }}
                  />
                );
              })}
              {d.items
                .filter((x) => x.id === personId)
                .map((x) => {
                  const m = managers ? x : x.resident;
                  return (
                    <TaskSheet
                      key={x.id}
                      title={m.name}
                      context={managers ? 'Manager' : 'Resident'}
                      busy={busy}
                      message={error}
                      onClose={() => setPersonId(null)}
                    >
                      <Text>{m.phone}</Text>
                      {managers ? (
                        owner ? (
                          <Button
                            title="Remove assignment"
                            variant="secondary"
                            disabled={busy}
                            onPress={() =>
                              confirm(
                                'Remove manager?',
                                'This removes access to this PG only.',
                                async () => {
                                  await api.delete(base + '/managers/' + m.id);
                                  reset();
                                }
                              )
                            }
                          />
                        ) : null
                      ) : (
                        <>
                          <Text>
                            Room {x.bed.room.label} · Bed {x.bed.label}
                          </Text>
                          <Button
                            title="Transfer room or bed"
                            variant="secondary"
                            disabled={busy}
                            onPress={() => {
                              reset();
                              setTarget(x);
                              setMode('transfer');
                            }}
                          />
                          <Button
                            title="Allocation history"
                            variant="secondary"
                            disabled={busy}
                            onPress={() => showHistory(x)}
                          />
                          <Button
                            title="Checkout"
                            variant="secondary"
                            disabled={busy}
                            onPress={() =>
                              confirm(
                                'Checkout resident?',
                                'This ends the current allocation. Rent and deposit settlement are separate.',
                                async () => {
                                  await api.post(base + '/allocations/' + x.id + '/checkout');
                                  reset();
                                }
                              )
                            }
                          />
                        </>
                      )}
                    </TaskSheet>
                  );
                })}{' '}
              {d.items.length > 0 && !matches.length ? (
                <EmptyState
                  title="No matches"
                  message="Try another name, number or room."
                  actionLabel="Clear search"
                  onAction={() => setSearch('')}
                />
              ) : null}
              {!d.items.length ? (
                <EmptyState title={managers ? 'No assigned managers' : 'No active residents'} />
              ) : null}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
