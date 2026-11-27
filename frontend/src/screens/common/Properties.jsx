import { useOwnerScope } from '../owner/Scope';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { Screen, Card, Button, TextField, LoadingState, ErrorState, EmptyState } from '../../components';
import RecordLink, { RecordGroup } from '../../components/RecordLink';
import TaskSheet from '../../components/TaskSheet';
import { Shortcuts } from '../owner/Overview';
import { colors } from '../../theme';
import useProperties from '../../hooks/useProperties';
import { api } from '../../api/client';

export default function Properties({ navigation }) {
  const scope = useOwnerScope();
  const owner = useSelector((s) => s.auth.user.role) === 'OWNER';
  const { items, state, reload } = useProperties();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const matches = items.filter((p) =>
    (p.name + ' ' + p.address).toLowerCase().includes(search.trim().toLowerCase())
  );
  function edit(property) {
    setDetail(null);
    setAttempted(false);
    setError('');
    setForm(property ? { ...property } : { name: '', address: '' });
  }
  async function save() {
    if (busy || !owner || !form) return;
    setAttempted(true);
    const name = form.name.trim(),
      address = form.address.trim();
    if (!name || !address) return;
    setBusy(true);
    setError('');
    try {
      if (form.id) await api.patch('/properties/' + form.id, { name, address });
      else await api.post('/properties', { name, address });
      setForm(null);
      setSearch('');
      reload();
    } catch {
      setError(
        'Could not confirm the save. Check your connection and refresh the property list before trying again.'
      );
    } finally {
      setBusy(false);
    }
  }
  function openModule(name) {
    const id = detail.id;
    scope?.setPropertyId(id);
    setDetail(null);
    navigation.navigate(name, { propertyId: id });
  }
  return (
    <Screen
      eyebrow={owner ? 'Portfolio' : 'Property operations'}
      title="Properties"
      subtitle={
        items.length ? items.length + ' ' + (items.length === 1 ? 'property' : 'properties') : undefined
      }
      action={owner ? <Button title="Add property" onPress={() => edit(null)} /> : undefined}
      refreshing={state === 'loading'}
      onRefresh={reload}
    >
      {state === 'loading' ? (
        <LoadingState />
      ) : state === 'error' ? (
        <ErrorState onRetry={reload} />
      ) : !items.length ? (
        <EmptyState
          title="No properties yet"
          message={
            owner
              ? 'Add your first PG to set up rooms and invite residents.'
              : 'Your assigned properties will appear here.'
          }
        />
      ) : (
        <>
          {(items.length > 1 || !!search) && (
            <TextField
              label="Find a property"
              placeholder="Property name or address"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          )}
          {!!matches.length && (
            <RecordGroup>
              {matches.map((p, index) => (
                <RecordLink
                  key={p.id}
                  grouped
                  divider={index > 0}
                  icon="building"
                  title={p.name}
                  detail={p.address}
                  onPress={() => setDetail(p)}
                />
              ))}
            </RecordGroup>
          )}
          {!matches.length && (
            <EmptyState
              title="No matching properties"
              actionLabel="Clear search"
              onAction={() => setSearch('')}
            />
          )}
        </>
      )}
      {detail && (
        <TaskSheet title={detail.name} context="Property" onClose={() => setDetail(null)}>
          <Card>
            <Text style={{ color: colors.muted }}>Address</Text>
            <Text style={{ color: colors.text, fontSize: 17 }}>{detail.address}</Text>
          </Card>
          <Shortcuts
            items={
              owner
                ? [
                    ['Rooms', 'Rooms & beds', 'room'],
                    ['Residents', 'Residents', 'people'],
                    ['Managers', 'Managers', 'user'],
                    ['Rent', 'Rent collection', 'finance'],
                    ['Reports', 'Reports', 'chart'],
                  ]
                : [
                    ['Rooms', 'Rooms & beds', 'room'],
                    ['Rent', 'Rent collection', 'finance'],
                    ['Maintenance', 'Maintenance', 'tool'],
                    ['Reports', 'Reports', 'chart'],
                  ]
            }
            onSelect={openModule}
          />
          {owner && <Button title="Edit property" variant="secondary" onPress={() => edit(detail)} />}
        </TaskSheet>
      )}
      {owner && form && (
        <TaskSheet
          title={form.id ? 'Edit property' : 'Add property'}
          busy={busy}
          message={error}
          onClose={() => setForm(null)}
        >
          <TextField
            label="Property name"
            placeholder="Name of your PG"
            maxLength={120}
            value={form.name}
            editable={!busy}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
            error={attempted && !form.name.trim() ? 'Enter a property name.' : undefined}
          />
          <TextField
            label="Address"
            placeholder="Street, area and city"
            multiline
            maxLength={500}
            value={form.address}
            editable={!busy}
            onChangeText={(address) => setForm((f) => ({ ...f, address }))}
            error={attempted && !form.address.trim() ? 'Enter the property address.' : undefined}
          />
          <Button title={form.id ? 'Save changes' : 'Create property'} loading={busy} onPress={save} />
        </TaskSheet>
      )}
    </Screen>
  );
}
