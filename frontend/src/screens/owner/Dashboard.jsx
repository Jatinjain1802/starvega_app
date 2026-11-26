import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Screen, Card, StatCard, LoadingState, ErrorState, EmptyState, Button } from '../../components';
import { Highlight, Shortcuts, Section, NotificationButton } from './Overview';
import { MonthPicker, PropertyPicker, monthLabel } from './Controls';
import { colors, currentMonth, money, percent, useOwnerPortfolio } from './portfolio';

const frequent = [
  ['Rent', 'Rent collection', 'finance'], ['ExpenseDetails', 'Expenses', 'receipt'],
  ['Rooms', 'Rooms & beds', 'room'], ['Residents', 'Residents', 'people']
];
const management = [
  ['Properties', 'Properties', 'building'], ['Managers', 'Managers', 'user'],
  ['Maintenance', 'Maintenance', 'tool'], ['Announcements', 'Announcements', 'bell'],
  ['Complaints', 'Complaints', 'chat'], ['Reports', 'Reports', 'chart']
];

export default function OwnerDashboard({ navigation }) {
  const [month, setMonth] = useState(currentMonth);
  const [propertyId, setPropertyId] = useState(null);
  const [more, setMore] = useState(false);
  const { status, data, reload } = useOwnerPortfolio(month);
  const selected = data?.properties.find(p => p.id === propertyId);
  const summary = selected || data?.totals;
  function open(name) {
    navigation.navigate(name, { propertyId: data ? selected?.id ?? null : propertyId, ...(['Finance', 'Reports'].includes(name) ? { month } : {}) });
  }

  return <Screen title="Portfolio overview" subtitle="Starvega PG · Owner" onRefresh={reload} refreshing={status === 'loading'}
    action={<NotificationButton onPress={() => navigation.navigate('Notifications')}/>}>
    <MonthPicker month={month} onChange={setMonth} latest={currentMonth()}/>
    {status === 'loading' ? <LoadingState message="Loading your portfolio…"/> :
      status === 'error' ? <ErrorState onRetry={reload}/> :
      !data.properties.length ? <EmptyState title="Add your first property" message="Set up your PG to start managing rooms and tracking rent."
        actionLabel="Manage properties" onAction={() => open('Properties')}/> : <>
        <PropertyPicker items={[{ id: null, name: 'All properties' }, ...data.properties]} value={selected?.id ?? null} onChange={setPropertyId}/>
        <Highlight label="Rent received" value={money(summary.collectedPaise)}
          detail={monthLabel(month) + ' · ' + (selected?.name || 'All properties')} action="View finances" onPress={() => open('Finance')}/>
        <View style={styles.grid}>
          <StatCard label="Outstanding rent" value={money(summary.outstandingPaise)} style={styles.stat}/>
          <StatCard label="Recorded expenses" value={money(summary.expensePaise)} style={styles.stat}/>
        </View>
        <Section>Current occupancy</Section>
        <Card><View style={styles.row}><Text style={styles.heading}>{summary.occupiedBeds} of {summary.beds} beds occupied</Text>
          {summary.occupancyPercent != null && <Text style={styles.rate}>{percent(summary.occupancyPercent)}</Text>}</View>
          <View style={styles.track}><View style={[styles.fill, { width: Math.min(100, Math.max(0, summary.occupancyPercent || 0)) + '%' }]}/></View>
          <Text style={styles.muted}>{summary.beds - summary.occupiedBeds} vacant beds · {summary.rooms - summary.occupiedRooms} vacant rooms</Text>
          <Text style={styles.muted}>{summary.occupiedRooms} of {summary.rooms} rooms occupied</Text>
        </Card>
      </>}
    <Section>Quick actions</Section>
    <Shortcuts items={more ? [...frequent, ...management] : frequent} onSelect={open}/>
    <Button title={more ? 'Show fewer tools' : 'All management tools'} variant="secondary" onPress={() => setMore(!more)}/>
  </Screen>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { flexGrow: 1, flexBasis: 140 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  heading: { color: colors.text, fontWeight: '700', fontSize: 16 }, muted: { color: colors.muted, fontSize: 14 },
  rate: { fontWeight: '700', color: colors.primary }, track: { height: 8, borderRadius: 4, backgroundColor: colors.soft, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary }
});
