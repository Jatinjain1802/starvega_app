import { useOwnerScope } from './Scope';
import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Screen, Card, LoadingState, ErrorState, EmptyState, Button } from '../../components';
import { Highlight, Shortcuts, Section, NotificationButton } from './Overview';
import { MonthPicker, PortfolioFilters, monthLabel } from './Controls';
import { colors, currentMonth, money, percent, useOwnerPortfolio } from './portfolio';

const frequent = [
  ['Rent', 'Rent collection', 'finance'],
  ['ExpenseDetails', 'Expenses', 'receipt'],
  ['Rooms', 'Rooms & beds', 'room'],
  ['Residents', 'Residents', 'people'],
];
const management = [
  ['Properties', 'Properties', 'building'],
  ['Managers', 'Managers', 'user'],
  ['Maintenance', 'Maintenance', 'tool'],
  ['Announcements', 'Announcements', 'bell'],
  ['Complaints', 'Complaints', 'chat'],
  ['Reports', 'Reports', 'chart'],
];

export default function OwnerDashboard({ navigation }) {
  const { month, setMonth, propertyId, setPropertyId } = useOwnerScope();
  const [more, setMore] = useState(false);
  const { status, data, reload } = useOwnerPortfolio(month);
  const selected = data?.properties.find((p) => p.id === propertyId);
  const summary = selected || data?.totals;
  function open(name) {
    navigation.navigate(name, {
      propertyId: data ? (selected?.id ?? null) : propertyId,
      ...(name === 'Complaints' ? { visit: Date.now() } : {}),
      ...(['Finance', 'Reports', 'Rent', 'ExpenseDetails'].includes(name) ? { month } : {}),
    });
  }

  return (
    <Screen
      title="Portfolio overview"
      eyebrow="Starvega PG · Owner"
      onRefresh={reload}
      refreshing={status === 'loading'}
      action={<NotificationButton onPress={() => navigation.navigate('Notifications')} />}
    >
      {(status !== 'ready' || !data?.properties.length) && (
        <MonthPicker month={month} onChange={setMonth} latest={currentMonth()} />
      )}
      {status === 'loading' ? (
        <LoadingState message="Loading your portfolio…" />
      ) : status === 'error' ? (
        <ErrorState onRetry={reload} />
      ) : !data.properties.length ? (
        <EmptyState
          title="Add your first property"
          message="Set up your PG to start managing rooms and tracking rent."
          actionLabel="Manage properties"
          onAction={() => open('Properties')}
        />
      ) : (
        <>
          <PortfolioFilters
            properties={data.properties}
            propertyId={selected?.id ?? null}
            onPropertyChange={setPropertyId}
            month={month}
            onMonthChange={setMonth}
            latest={currentMonth()}
          />
          <Highlight
            label="Rent received"
            value={money(summary.collectedPaise)}
            metrics={[
              ['Outstanding rent', money(summary.outstandingPaise)],
              ['Recorded expenses', money(summary.expensePaise)],
            ]}
            detail={monthLabel(month) + ' · ' + (selected?.name || 'All properties')}
            action="View finances"
            onPress={() => open('Finance')}
          />
        </>
      )}
      <Section>Quick actions</Section>
      <Shortcuts items={frequent} onSelect={open} />
      {more && (
        <>
          <Section>Management tools</Section>
          <Shortcuts items={management} onSelect={open} />
        </>
      )}
      <Button
        title={more ? 'Show fewer tools' : 'All management tools'}
        variant="secondary"
        onPress={() => setMore(!more)}
      />
      {status === 'ready' && !!data?.properties.length && (
        <>
          <Section>Current occupancy</Section>
          <Card>
            <View style={styles.row}>
              <Text style={styles.heading}>
                {summary.occupiedBeds} of {summary.beds} beds occupied
              </Text>
              {summary.occupancyPercent != null && (
                <Text style={styles.rate}>{percent(summary.occupancyPercent)}</Text>
              )}
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: Math.min(100, Math.max(0, summary.occupancyPercent || 0)) + '%' },
                ]}
              />
            </View>
            <Text style={styles.muted}>
              {summary.beds - summary.occupiedBeds} vacant beds · {summary.rooms - summary.occupiedRooms}{' '}
              vacant rooms
            </Text>
            <Text style={styles.muted}>
              {summary.occupiedRooms} of {summary.rooms} rooms occupied
            </Text>
            {selected && (
              <Button title="View rooms and beds" variant="secondary" onPress={() => open('Rooms')} />
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  heading: { color: colors.text, fontWeight: '700', fontSize: 16 },
  muted: { color: colors.muted, fontSize: 14 },
  rate: { fontWeight: '700', color: colors.primary },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.soft, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.brass },
});
