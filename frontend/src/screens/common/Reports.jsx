import { colors } from '../../theme';
import { useReportingMonth } from '../owner/Scope';
import { PropertyPicker, MonthPicker, Choices } from '../../components/Controls';
import React, { useCallback, useState } from 'react';
import { Text, View, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Card, Button, LoadingState, ErrorState, EmptyState } from '../../components';
import useProperties from '../../hooks/useProperties';
import { api } from '../../api/client';
const now = () => new Date(Date.now() + 19800000).toISOString().slice(0, 7);
const money = (n) => '₹' + (n / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const labels = {
  rent: 'Rent collection',
  expenses: 'Expenses',
  occupancy: 'Current occupancy',
  complaints: 'Complaints',
};

function useReport(path, params) {
  const [state, setState] = useState({ key: null, status: 'loading' }),
    [rev, setRev] = useState(0);
  const key = path ? path + '?' + JSON.stringify(params) : null;
  useFocusEffect(
    useCallback(() => {
      if (!path) return;
      const c = new AbortController();
      setState({ key, status: 'loading' });
      api
        .get(path, { params, signal: c.signal })
        .then(({ data }) => {
          if (!c.signal.aborted) setState({ key, status: 'ready', data });
        })
        .catch((e) => {
          if (!c.signal.aborted) setState({ key, status: 'error', large: e.response?.status === 422 });
        });
      return () => c.abort();
    }, [key, rev])
  );
  return { ...(state.key === key ? state : { status: 'loading' }), reload: () => setRev((n) => n + 1) };
}
export default function Reports({ route }) {
  const p = useProperties(route.params?.propertyId),
    [month, setMonth] = useReportingMonth(route.params?.month),
    [kind, setKind] = useState('rent'),
    [limit, setLimit] = useState(50),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const path = p.selected ? '/properties/' + p.selected + '/reports/' + kind : null,
    q = useReport(path, { month }),
    d = q.data;
  async function share() {
    if (busy || !path) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get(path, { params: { month, format: 'csv' }, responseType: 'text' });
      await Share.share({ message: data, title: labels[kind] + ' report' });
    } catch {
      setError('Unable to share CSV report.');
    } finally {
      setBusy(false);
    }
  }
  const columnLabel = (c) =>
    ({
      resident: 'Resident',
      billedPaise: 'Billed',
      paidPaise: 'Paid',
      outstandingPaise: 'Outstanding',
      date: 'Date',
      category: 'Category',
      description: 'Description',
      manager: 'Manager',
      totalPaise: 'Total',
      receiptCount: 'Receipts',
      room: 'Room',
      beds: 'Beds',
      occupiedBeds: 'Occupied beds',
      vacantBeds: 'Vacant beds',
      currentStatus: 'Status',
      count: 'Count',
    })[c] || c;
  const format = (column, value) =>
    column.endsWith('Paise')
      ? money(value)
      : column === 'date'
        ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : String(value ?? '');
  return (
    <Screen
      title="Property reports"
      refreshing={p.state === 'loading' || (!!p.selected && q.status === 'loading')}
      onRefresh={() => {
        p.reload();
        q.reload();
      }}
    >
      {error ? <Text>{error}</Text> : null}
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
              setLimit(50);
            }}
          />
          <Choices
            label="Report type"
            options={Object.entries(labels)}
            value={kind}
            disabled={busy}
            onChange={(k) => {
              setKind(k);
              setLimit(50);
            }}
          />
          {kind !== 'occupancy' ? (
            <MonthPicker month={month} latest={now()} onChange={setMonth} disabled={busy} />
          ) : (
            <Text>Occupancy reflects the beds occupied today.</Text>
          )}
          {q.status === 'loading' ? (
            <LoadingState />
          ) : q.status === 'error' ? (
            <ErrorState
              message={
                q.large ? 'Report exceeds the server limit of 10,000 rows.' : 'Unable to load report.'
              }
              onRetry={q.reload}
            />
          ) : (
            <>
              <Card>
                <Text>
                  {labels[kind]} · {d.rows.length} records
                </Text>
                <Text>As of {new Date(d.asOf).toLocaleString()}</Text>
                <Button
                  title="Share report as CSV"
                  loading={busy}
                  disabled={!d.rows.length}
                  onPress={share}
                />
                <Text>Shares CSV text. Money values in the export are in paise.</Text>
              </Card>
              {!d.rows.length ? (
                <EmptyState title="No report records" />
              ) : (
                d.rows.slice(0, limit).map((row, i) => (
                  <Card key={i}>
                    {d.columns.map((c, j) => (
                      <View
                        key={c}
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <Text style={{ color: colors.muted }}>{columnLabel(c)}</Text>
                        <Text style={{ fontWeight: '600', color: colors.text }}>
                          {format(c, row[j])}
                        </Text>
                      </View>
                    ))}
                  </Card>
                ))
              )}
              {d.rows.length > limit ? (
                <Button
                  title="Show more records"
                  variant="secondary"
                  onPress={() => setLimit((n) => n + 50)}
                />
              ) : null}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
