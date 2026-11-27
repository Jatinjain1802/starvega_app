import React, { useState, useCallback } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Card, LoadingState, ErrorState, EmptyState, StatusPill } from '../../components';
import RecordLink, { RecordGroup } from '../../components/RecordLink';
import { PropertyPicker, monthLabel } from '../../components/Controls';
import { Highlight, Shortcuts, Section, NotificationButton } from '../owner/Overview';
import useProperties from '../../hooks/useProperties';
import { api } from '../../api/client';
import { colors } from '../../theme';
const money = (n) => '₹' + (n / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const tools = [
  ['Properties', 'Properties', 'building'],
  ['Rooms', 'Rooms & beds', 'room'],
  ['Residents', 'Residents', 'people'],
  ['Expenses', 'Expenses', 'receipt'],
  ['Maintenance', 'Maintenance', 'tool'],
  ['Announcements', 'Announcements', 'bell'],
  ['Reports', 'Reports', 'chart'],
];
export default function ManagerDashboard({ navigation }) {
  const p = useProperties(),
    selected = p.selected;
  const [revision, setRevision] = useState(0),
    [detail, setDetail] = useState(null),
    [detailState, setDetailState] = useState('loading');
  const reload = () => {
    p.reload();
    setRevision((n) => n + 1);
  };
  useFocusEffect(
    useCallback(() => {
      if (!selected) return;
      const c = new AbortController();
      setDetail(null);
      setDetailState('loading');
      const base = '/properties/' + selected;
      Promise.all(
        ['/rooms', '/people/residents', '/rent', '/complaints'].map((path) =>
          api.get(base + path, { signal: c.signal })
        )
      )
        .then(([rooms, residents, rent, complaints]) => {
          if (!c.signal.aborted) {
            setDetail({
              id: selected,
              rooms: rooms.data.occupancy,
              residents: residents.data.items,
              rent: rent.data,
              complaints: complaints.data.items,
            });
            setDetailState('ready');
          }
        })
        .catch(() => {
          if (!c.signal.aborted) setDetailState('error');
        });
      return () => c.abort();
    }, [selected, revision])
  );
  const d = detail?.id === selected ? detail : null;
  const go = (name, params = {}) => navigation.navigate(name, { propertyId: selected, ...params });
  const urgent = d?.complaints.filter((c) => c.safety && c.status !== 'RESOLVED') || [];
  const dues =
    d?.rent.items
      .filter((r) => r.outstandingPaise > 0)
      .sort((a, b) => b.outstandingPaise - a.outstandingPaise) || [];
  return (
    <Screen
      eyebrow="Starvega PG · Manager"
      title="Operations desk"
      action={<NotificationButton onPress={() => go('Notifications')} />}
      onRefresh={reload}
      refreshing={p.state === 'loading' || (!!selected && detailState === 'loading')}
    >
      {p.state === 'loading' ? (
        <LoadingState />
      ) : p.state === 'error' ? (
        <ErrorState onRetry={reload} />
      ) : !p.items.length ? (
        <EmptyState
          title="No assigned properties"
          message="Contact your owner to get a PG assignment."
        />
      ) : (
        <>
          <PropertyPicker items={p.items} value={selected} onChange={p.setSelected} />
          {detailState === 'error' ? (
            <ErrorState onRetry={reload} />
          ) : !d || detailState === 'loading' ? (
            <LoadingState />
          ) : (
            <>
              <Highlight
                label="Outstanding rent"
                value={money(d.rent.summary.outstandingPaise)}
                detail={monthLabel(d.rent.month)}
                action="View rent collection"
                onPress={() => go('Rent')}
                metrics={[
                  ['Overdue', money(d.rent.summary.overduePaise)],
                  ['Residents with dues', String(dues.length)],
                ]}
              />
              <Section>Safety queue</Section>
              <RecordGroup>
                {urgent.slice(0, 5).map((c, i) => (
                  <RecordLink
                    key={c.id}
                    grouped
                    divider={i > 0}
                    icon="chat"
                    title={c.title}
                    badge={<StatusPill status="URGENT" />}
                    onPress={() => go('Complaints', { complaintId: c.id })}
                  />
                ))}
                <RecordLink
                  grouped
                  divider={!!urgent.length}
                  icon="chat"
                  title="View complaints"
                  detail={!urgent.length ? 'No open safety complaints in this list.' : undefined}
                  onPress={() => go('Complaints')}
                />
              </RecordGroup>
              <Section>Property operations</Section>
              <Shortcuts items={tools} onSelect={go} />
              <Section>Occupancy</Section>
              <RecordGroup>
                <RecordLink
                  grouped
                  icon="room"
                  title={d.rooms.vacantBeds + ' vacant beds'}
                  detail={
                    d.rooms.occupiedRooms +
                    ' occupied rooms · ' +
                    d.rooms.vacantRooms +
                    ' vacant rooms · ' +
                    d.rooms.totalRooms +
                    ' total'
                  }
                  onPress={() => go('Rooms')}
                />
                <RecordLink
                  grouped
                  divider
                  icon="people"
                  title={d.residents.length + ' residents'}
                  detail={d.rooms.occupiedBeds + ' occupied beds'}
                  onPress={() => go('Residents')}
                />
              </RecordGroup>
              {!!dues.length && (
                <>
                  <Section>Largest balances</Section>
                  <Card>
                    {dues.slice(0, 5).map((x) => (
                      <Text key={x.id} style={{ color: colors.text, fontSize: 16 }}>
                        {x.resident.name} · {money(x.outstandingPaise)}
                      </Text>
                    ))}
                  </Card>
                </>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
