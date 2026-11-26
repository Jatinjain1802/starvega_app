import { useOwnerScope } from './Scope';
import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Screen, Card, Button, EmptyState, ErrorState, LoadingState } from '../../components';
import { MonthPicker, PortfolioFilters, monthLabel } from './Controls';
import { Highlight, Section } from './Overview';
import { colors, currentMonth, money, percent, useOwnerPortfolio } from './portfolio';

function Figures({ rows }) {
  return rows.map(([label, value]) => (
    <View key={label} style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  ));
}

export default function Finance({ navigation, route }) {
  const { month, setMonth, propertyId, setPropertyId } = useOwnerScope();
  useEffect(() => {
    if (!route.params?.month) return;
    setMonth(route.params.month);
    setPropertyId(route.params.propertyId ?? null);
    navigation.setParams({ month: undefined, propertyId: undefined });
  }, [route.params, navigation, setMonth, setPropertyId]);
  const { status, data, reload } = useOwnerPortfolio(month);
  const selected = data?.properties.find((p) => p.id === propertyId);
  const summary = selected || data?.totals;
  const included = selected ? [selected] : data?.properties || [];
  const categories = new Map();
  for (const property of included) {
    for (const { category, totalPaise } of property.expenseCategories) {
      categories.set(category, (categories.get(category) || 0) + totalPaise);
    }
  }
  const expenses = [...categories]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => [
      category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, ' '),
      money(amount),
    ]);

  return (
    <Screen
      title="Finances"
      subtitle="Cash flow and rent collection"
      onRefresh={reload}
      refreshing={status === 'loading'}
    >
      {(status !== 'ready' || !data?.properties.length) && (
        <MonthPicker month={month} onChange={setMonth} latest={currentMonth()} />
      )}
      {status === 'loading' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState onRetry={reload} />
      ) : !data.properties.length ? (
        <EmptyState
          title="No properties yet"
          actionLabel="Manage properties"
          onAction={() => navigation.navigate('Properties')}
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
            label="Receipts less recorded expenses"
            value={money(summary.netCashPaise)}
            metrics={[
              ['Rent received', money(summary.collectedPaise)],
              ['Recorded expenses', money(summary.expensePaise)],
            ]}
            detail={monthLabel(month) + ' · ' + (selected?.name || 'All properties')}
          />
          <Section>Rent for {monthLabel(month)}</Section>
          <Card>
            <Figures
              rows={[
                ['Rent billed', money(summary.billedPaise)],
                ['Collected against dues', money(summary.paidAgainstDuesPaise)],
                ['Outstanding on these dues', money(summary.outstandingPaise)],
                ['Collection rate', percent(summary.collectionPercent)],
              ]}
            />
            <Text style={styles.note}>Includes payments received after the billing month.</Text>
          </Card>
          <Section>Expense breakdown</Section>
          {expenses.length ? (
            <Card>
              <Figures rows={expenses} />
            </Card>
          ) : (
            <EmptyState title="No recorded expenses this month" />
          )}
          <Section>{selected ? 'Property details' : 'Property comparison'}</Section>
          {included.map((p) => (
            <Card key={p.id}>
              <Text style={styles.heading}>{p.name}</Text>
              <Text style={styles.note}>{p.address}</Text>
              <Figures
                rows={[
                  ['Rent received', money(p.collectedPaise)],
                  ['Expenses', money(p.expensePaise)],
                  ['Outstanding rent', money(p.outstandingPaise)],
                  ['Collection rate', percent(p.collectionPercent)],
                  [
                    'Current bed occupancy',
                    percent(p.occupancyPercent) + ' · ' + p.occupiedBeds + '/' + p.beds + ' beds',
                  ],
                ]}
              />
              <Button
                title="Review expenses"
                variant="secondary"
                onPress={() => {
                  setPropertyId(p.id);
                  navigation.navigate('ExpenseDetails', { propertyId: p.id, month });
                }}
              />
              <Button
                title="View property reports"
                variant="secondary"
                onPress={() => {
                  setPropertyId(p.id);
                  navigation.navigate('Reports', { propertyId: p.id, month });
                }}
              />
            </Card>
          ))}
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
    gap: 8,
    paddingVertical: 3,
  },
  label: { color: colors.muted, fontSize: 15 },
  value: { color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  note: { color: colors.muted, fontSize: 13 },
  heading: { color: colors.text, fontWeight: '700', fontSize: 18 },
});
