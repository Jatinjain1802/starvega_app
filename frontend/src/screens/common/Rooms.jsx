import TaskSheet from '../../components/TaskSheet';
import { PropertyPicker, Choices } from '../../components/Controls';
import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import {
  Screen,
  Card,
  Button,
  TextField,
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
  StatusPill,
} from '../../components';
import useProperties from '../../hooks/useProperties';
import { api } from '../../api/client';
import { colors, spacing } from '../../theme';
export default function Rooms({ route }) {
  const [showOccupancy, setShowOccupancy] = useState(false);
  const [query, setQuery] = useState('');
  const props = useProperties(route.params?.propertyId);
  const { items, selected, setSelected, state } = props;
  const [data, setData] = useState(null),
    [status, setStatus] = useState('loading'),
    [revision, setRevision] = useState(0),
    [form, setForm] = useState(false),
    [label, setLabel] = useState(''),
    [capacity, setCapacity] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [filter, setFilter] = useState('ALL');
  useEffect(() => {
    if (!selected) return;
    const c = new AbortController();
    setData(null);
    setStatus('loading');
    api
      .get('/properties/' + selected + '/rooms', { signal: c.signal })
      .then(({ data }) => {
        if (!c.signal.aborted) {
          setData({ id: selected, ...data });
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!c.signal.aborted) setStatus('error');
      });
    return () => c.abort();
  }, [selected, revision]);
  const reload = () => {
    props.reload();
    setRevision((n) => n + 1);
  };
  async function save() {
    if (busy || !selected) return;
    const n = Number(capacity);
    if (
      !label.trim() ||
      label.trim().length > 80 ||
      !/^\d+$/.test(capacity) ||
      !Number.isInteger(n) ||
      n < 1 ||
      n > 20
    ) {
      setError('Enter a room label and capacity from 1 to 20.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/properties/' + selected + '/rooms', { label: label.trim(), capacity: n });
      setForm(false);
      setLabel('');
      setCapacity('');
      setRevision((x) => x + 1);
    } catch (e) {
      setError(
        e.response?.status === 409
          ? 'This room label already exists.'
          : 'Unable to create room. Refresh before retrying.'
      );
    } finally {
      setBusy(false);
    }
  }
  const d = data?.id === selected ? data : null;
  const term = query.trim().toLowerCase();
  const rooms =
    d?.items
      .filter((r) =>
        [r.label, ...r.beds.map((b) => b.label)].some((label) =>
          String(label).toLowerCase().includes(term)
        )
      )
      .filter(
        (r) =>
          filter === 'ALL' ||
          (filter === 'VACANT'
            ? r.beds.every((b) => !b.occupied)
            : filter === 'AVAILABLE'
              ? r.beds.some((b) => !b.occupied)
              : r.beds.some((b) => b.occupied))
      ) || [];
  return (
    <Screen
      title="Rooms and beds"
      action={
        state === 'ready' && selected ? (
          <Button
            title="Create room"
            disabled={busy}
            onPress={() => {
              setForm(true);
              setError('');
            }}
          />
        ) : undefined
      }
      onRefresh={reload}
      refreshing={state === 'loading' || (!!selected && status === 'loading')}
    >
      {state === 'loading' ? (
        <LoadingState />
      ) : state === 'error' ? (
        <ErrorState onRetry={reload} />
      ) : !items.length ? (
        <EmptyState title="No properties available" />
      ) : (
        <>
          <PropertyPicker
            items={items}
            value={selected}
            disabled={busy}
            onChange={(id) => {
              setSelected(id);
              setForm(false);
              setError('');
              setLabel('');
              setCapacity('');
              setQuery('');
            }}
          />

          {form ? (
            <TaskSheet
              title="Create room"
              context={items.find((x) => x.id === selected)?.name}
              busy={busy}
              onClose={() => setForm(false)}
            >
              <TextField
                label="Room name or number"
                placeholder="For example, 101"
                value={label}
                maxLength={80}
                editable={!busy}
                onChangeText={setLabel}
              />
              <TextField
                label="Number of beds (1–20)"
                value={capacity}
                keyboardType="number-pad"
                maxLength={2}
                editable={!busy}
                onChangeText={setCapacity}
              />
              {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
              <Button title="Create room and beds" loading={busy} onPress={save} />
            </TaskSheet>
          ) : null}
          {status === 'error' ? (
            <ErrorState onRetry={reload} />
          ) : !d ? (
            <LoadingState />
          ) : (
            <>
              <View style={styles.grid}>
                {Object.entries({
                  Rooms: d.occupancy.totalRooms,
                  'Vacant beds': d.occupancy.vacantBeds,
                }).map(([label, value]) => (
                  <StatCard key={label} label={label} value={String(value)} style={styles.stat} />
                ))}
              </View>
              <Button
                title={showOccupancy ? 'Hide occupancy details' : 'View occupancy details'}
                variant="secondary"
                onPress={() => setShowOccupancy((v) => !v)}
              />
              {showOccupancy && (
                <Card>
                  <Text>
                    {d.occupancy.occupiedRooms} occupied rooms · {d.occupancy.vacantRooms} vacant rooms
                  </Text>
                  <Text>
                    {d.occupancy.occupiedBeds} of {d.occupancy.totalBeds} beds occupied
                  </Text>
                </Card>
              )}
              <Card>
                <TextField
                  label="Search rooms"
                  placeholder="Room or bed label"
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                />
                <Choices
                  label="Occupancy"
                  options={[
                    ['ALL', 'All rooms'],
                    ['VACANT', 'Fully vacant'],
                    ['AVAILABLE', 'Vacant beds'],
                    ['OCCUPIED', 'Occupied beds'],
                  ]}
                  value={filter}
                  onChange={setFilter}
                />
              </Card>
              {!rooms.length ? (
                <EmptyState
                  title="No matching rooms"
                  message="Try another room label or occupancy filter."
                  actionLabel="Reset filters"
                  onAction={() => {
                    setQuery('');
                    setFilter('ALL');
                  }}
                />
              ) : (
                rooms.map((r) => (
                  <Card key={r.id}>
                    <Text style={styles.heading}>Room {r.label}</Text>
                    <Text>
                      {r.beds.filter((b) => b.occupied).length} / {r.beds.length} beds occupied
                    </Text>
                    <View style={styles.grid}>
                      {r.beds.map((b) => (
                        <View key={b.id} style={styles.row}>
                          <Text style={styles.bedLabel}>Bed {b.label}</Text>
                          <StatusPill
                            status={b.occupied ? 'OCCUPIED' : 'VACANT'}
                            tone={b.occupied ? 'warning' : 'success'}
                          />
                        </View>
                      ))}
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { fontSize: 17, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { width: '48%', flexGrow: 1 },
  bedLabel: { fontWeight: '600', color: colors.text },
  row: {
    flexGrow: 1,
    flexBasis: '42%',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderColor: colors.border,
    borderWidth: 1,
  },
});
