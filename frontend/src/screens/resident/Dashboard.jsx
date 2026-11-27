import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, LoadingState, ErrorState, EmptyState } from '../../components';
import Courtyard from '../../components/Courtyard';
import RecordLink from '../../components/RecordLink';
import { Highlight, Shortcuts, Section, NotificationButton } from '../owner/Overview';
import { api } from '../../api/client';
const money = (n) => '₹' + (n / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export default function ResidentDashboard({ navigation }) {
  const [data, setData] = useState(null),
    [state, setState] = useState('loading'),
    [revision, setRevision] = useState(0);
  const reload = () => setRevision((n) => n + 1);
  useFocusEffect(
    useCallback(() => {
      const c = new AbortController();
      setState('loading');
      api
        .get('/resident/dashboard', { signal: c.signal })
        .then(({ data }) => {
          if (!c.signal.aborted) {
            setData(data);
            setState('ready');
          }
        })
        .catch(() => {
          if (!c.signal.aborted) {
            setData(null);
            setState('error');
          }
        });
      return () => c.abort();
    }, [revision])
  );
  const bed = data?.allocation?.bed,
    property = bed?.room?.property;
  const go = (name) => navigation.navigate(name, property ? { propertyId: property.id } : undefined);
  return (
    <Screen
      eyebrow="Starvega PG · Resident"
      title={data ? 'Hello, ' + data.resident.name.split(' ')[0] : 'Resident home'}
      refreshing={state === 'loading'}
      onRefresh={reload}
      action={<NotificationButton onPress={() => go('Notifications')} />}
    >
      {state === 'loading' ? (
        <LoadingState />
      ) : state === 'error' ? (
        <ErrorState onRetry={reload} />
      ) : data ? (
        <>
          <Highlight
            label="Outstanding rent"
            value={money(data.outstandingPaise)}
            action={data.outstandingPaise > 0 ? 'View and pay rent' : 'View rent details'}
            onPress={() => go('Rent')}
          />
          {property ? (
            <>
              <Courtyard
                label="YOUR STAY"
                title={property.name}
                detail={['Room ' + bed.room.label, 'Bed ' + bed.label, property.address]
                  .filter(Boolean)
                  .join(' · ')}
              />
              <Section>Resident services</Section>
              <Shortcuts
                items={[
                  ['Complaints', 'Complaints', 'chat'],
                  ['Updates', 'PG updates', 'bell'],
                  ['PaymentHistory', 'Receipts', 'receipt'],
                  ['ManagerContact', 'Manager contact', 'people'],
                ]}
                onSelect={go}
              />
            </>
          ) : (
            <>
              <EmptyState
                title="No active room allocation"
                message="Contact your PG staff to confirm your accommodation."
              />
              <RecordLink title="Payment history" icon="receipt" onPress={() => go('PaymentHistory')} />
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}
