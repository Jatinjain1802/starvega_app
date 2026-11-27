import { LedgerLine } from '../../components/Ledger';
import { useFocusEffect } from '@react-navigation/native';
import { colors, type } from '../../theme';
import { useReportingMonth } from '../owner/Scope';
import TaskSheet from '../../components/TaskSheet';
import { Highlight, Section } from '../owner/Overview';
import {
  PropertyPicker,
  Choices,
  MonthPicker,
  monthLabel,
  displayName,
} from '../../components/Controls';
import React, { useEffect, useState, useRef } from 'react';
import { Text, Alert, Share } from 'react-native';
import { useSelector } from 'react-redux';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
import RazorpayCheckout from 'react-native-razorpay';
import {
  Screen,
  Card,
  Button,
  TextField,
  StatCard,
  StatusPill,
  LoadingState,
  ErrorState,
  EmptyState,
} from '../../components';
import useProperties from '../../hooks/useProperties';
import { api } from '../../api/client';
const money = (n) => '₹' + (n / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const monthNow = () => new Date(Date.now() + 19800000).toISOString().slice(0, 7);
function paise(s) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}
async function shareReceipt(path) {
  const {
    data: { receipt: r },
  } = await api.get(path);
  await Share.share({
    message: [
      'STARVEGA PG — Rent receipt',
      r.receiptNumber,
      r.rentDue.property.name,
      r.rentDue.resident.name,
      'Month: ' + r.rentDue.month,
      'Amount: ' + money(r.amountPaise),
      'Method: ' + r.method,
      'Paid: ' + new Date(r.paidAt).toLocaleString(),
      'Reference: ' + r.reference,
    ].join('\n'),
  });
}
export function ResidentRent({ route, navigation }) {
  const history = route.name === 'PaymentHistory';
  const user = useSelector((s) => s.auth.user);
  const [rows, setRows] = useState([]),
    [state, setState] = useState('loading'),
    [rev, setRev] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const reload = () => setRev((n) => n + 1);
  useFocusEffect(
    React.useCallback(() => {
      const c = new AbortController();
      setState('loading');
      (async () => {
        let cursor = null,
          items = [];
        do {
          const { data } = await api.get('/resident/rent', {
            params: cursor ? { cursor } : {},
            signal: c.signal,
          });
          items.push(...data.items);
          cursor = data.nextCursor;
        } while (cursor && !c.signal.aborted);
        if (!c.signal.aborted) {
          setRows(items.sort((a, b) => b.month.localeCompare(a.month)));
          setState('ready');
        }
      })().catch(() => {
        if (!c.signal.aborted) setState('error');
      });
      return () => c.abort();
    }, [rev])
  );
  const paying = useRef(false);
  async function pay(d) {
    if (busy || paying.current) return;
    paying.current = true;
    setBusy(true);
    setMessage('');
    try {
      const { data: o } = await api.post('/payments/orders', { rentDueId: d.id });
      await RazorpayCheckout.open({
        key: o.keyId,
        order_id: o.orderId,
        amount: o.amountPaise,
        currency: o.currency,
        name: 'Starvega PG',
        description: 'Rent ' + d.month,
        prefill: { name: user.name, contact: user.phone },
      });
      setMessage(
        'Checkout completed. Payment is pending backend confirmation. Refresh to check the status.'
      );
    } catch (e) {
      setMessage(
        e.response?.data?.error === 'PAYMENTS_DISABLED'
          ? 'Online payments are not configured.'
          : 'Checkout did not confirm payment. Refresh before trying again. Contact staff if debited.'
      );
    } finally {
      paying.current = false;
      setBusy(false);
      reload();
    }
  }
  async function receipt(id) {
    if (busy) return;
    setBusy(true);
    try {
      await shareReceipt('/resident/payments/' + id + '/receipt');
    } catch {
      setMessage('Unable to share receipt.');
    } finally {
      setBusy(false);
    }
  }
  const payments = rows
    .flatMap((d) => d.payments.map((p) => ({ ...p, month: d.month, property: d.property.name })))
    .sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt));
  const date = (s) =>
    new Date(s).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  return (
    <Screen
      eyebrow="Resident account"
      title={history ? 'Payment history' : 'My rent'}
      refreshing={state === 'loading'}
      onRefresh={reload}
    >
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
      {state === 'loading' ? (
        <LoadingState />
      ) : state === 'error' ? (
        <ErrorState onRetry={reload} />
      ) : history ? (
        <>
          {payments.length ? (
            <>
              <Highlight
                label="Total paid"
                value={money(payments.reduce((n, p) => n + p.amountPaise, 0))}
                detail={payments.length + ' recorded payments'}
              />
              <Section>Receipts</Section>
              {payments.map((p) => (
                <Card key={p.id}>
                  <Text style={{ ...type.section, color: colors.text }}>{money(p.amountPaise)}</Text>
                  <Text>
                    {p.property} · {monthLabel(p.month)}
                  </Text>
                  <LedgerLine label={displayName(p.method)} value={date(p.paidAt)} />
                  <Button
                    title="Share receipt"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => receipt(p.id)}
                  />
                </Card>
              ))}
            </>
          ) : (
            <EmptyState
              title="No payments yet"
              message="Receipts appear here after a payment is recorded."
            />
          )}
        </>
      ) : (
        <>
          <Highlight
            label="Total outstanding"
            value={money(rows.reduce((n, d) => n + d.outstandingPaise, 0))}
            action="Payment history"
            onPress={() => navigation.navigate('PaymentHistory')}
          />
          {rows.length ? (
            <>
              <Section>Monthly charges</Section>
              {rows.map((d) => (
                <Card key={d.id}>
                  <Text style={{ ...type.section, color: colors.text }}>{monthLabel(d.month)}</Text>
                  <Text style={{ color: colors.muted }}>{d.property.name}</Text>
                  <StatusPill
                    status={
                      d.outstandingPaise === 0
                        ? 'PAID'
                        : Date.parse(d.dueAt) < Date.now()
                          ? 'OVERDUE'
                          : 'PENDING'
                    }
                  />
                  <LedgerLine label="Due date" value={date(d.dueAt)} />
                  <LedgerLine label="Billed" value={money(d.amountPaise)} />
                  <LedgerLine label="Outstanding" value={money(d.outstandingPaise)} />
                  {d.outstandingPaise > 0 && (
                    <Button title="Pay outstanding rent" disabled={busy} onPress={() => pay(d)} />
                  )}
                </Card>
              ))}
            </>
          ) : (
            <EmptyState title="No rent records" />
          )}
        </>
      )}
    </Screen>
  );
}
export function StaffRent({ route }) {
  const owner = useSelector((s) => s.auth.user.role) === 'OWNER';
  const p = useProperties(route.params?.propertyId),
    id = p.selected,
    base = '/properties/' + id + '/rent';
  const [month, setMonth] = useReportingMonth(route.params?.month);
  const [result, setResult] = useState({}),
    [rev, setRev] = useState(0),
    [filter, setFilter] = useState('DUE');
  const [settings, setSettings] = useState(false),
    [rent, setRent] = useState(''),
    [day, setDay] = useState('');
  const [draft, setDraft] = useState(null),
    [receipt, setReceipt] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const locked = useRef(false),
    reload = () => setRev((n) => n + 1);
  const property = p.items.find((x) => x.id === id);
  useEffect(() => {
    if (!id) return;
    const c = new AbortController();
    setResult({ id, month, status: 'loading' });
    api
      .get(base, { params: { month }, signal: c.signal })
      .then(({ data }) => {
        if (!c.signal.aborted) setResult({ id, month, status: 'ready', data });
      })
      .catch(() => {
        if (!c.signal.aborted) setResult({ id, month, status: 'error' });
      });
    return () => c.abort();
  }, [id, month, rev]);
  async function run(fn) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      const errors = {
        ONLINE_ORDER_ACTIVE: 'An online payment is in progress for this resident.',
        AMOUNT_EXCEEDS_BALANCE:
          'The outstanding balance changed. Close and refresh before recording another payment.',
        RENT_NOT_CONFIGURED: 'Set a monthly rent and due day before generating dues.',
      };
      setMessage(
        errors[e.response?.data?.error] ||
          'Could not confirm the request. Check the balance before starting a new payment.'
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function save() {
    const amount = paise(rent),
      n = Number(day);
    if (
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 100000000 ||
      !Number.isInteger(n) ||
      n < 1 ||
      n > 28
    ) {
      setMessage('Enter rent up to ₹10,00,000 and a due day from 1 to 28.');
      return;
    }
    run(async () => {
      await api.patch(base + '/settings', { monthlyRentPaise: amount, rentDueDay: n });
      setSettings(false);
      setMessage('Rent settings saved for future dues.');
    });
  }
  function generate() {
    Alert.alert(
      'Generate dues for ' + monthLabel(monthNow()) + '?',
      'Create missing dues for active residents at ' +
        property.name +
        '. Existing dues stay as recorded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate dues',
          onPress: () =>
            run(async () => {
              const { data } = await api.post(base + '/generate', { month: monthNow() });
              setSettings(false);
              setMonth(monthNow());
              setMessage(data.created + ' new dues created. ' + data.existing + ' already existed.');
              reload();
            }),
        },
      ]
    );
  }
  function record() {
    const amount = paise(draft.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > draft.balance) {
      setMessage('Enter an amount greater than zero and within the outstanding balance.');
      return;
    }
    const payload = draft.payload || {
      rentDueId: draft.id,
      amountPaise: amount,
      method: draft.method,
      idempotencyKey: uuid(),
    };
    run(async () => {
      setDraft((d) => ({ ...d, payload }));
      const { data } = await api.post(base + '/payments/offline', payload);
      setDraft(null);
      setReceipt(data.receipt);
      reload();
    });
  }
  function closeDraft() {
    const close = () => {
      setDraft(null);
      setMessage('');
      reload();
    };
    if (draft.payload)
      Alert.alert('Close payment?', 'Refresh and verify the balance before recording another payment.', [
        { text: 'Keep open', style: 'cancel' },
        { text: 'Close', onPress: close },
      ]);
    else close();
  }
  const data = result.id === id && result.month === month ? result.data : null;
  const rows =
    data?.items.filter(
      (x) => filter === 'ALL' || (filter === 'DUE' ? x.outstandingPaise > 0 : x.outstandingPaise === 0)
    ) || [];
  return (
    <Screen
      title="Rent collection"
      refreshing={p.state === 'loading' || (!!id && result.status === 'loading')}
      onRefresh={() => {
        p.reload();
        reload();
      }}
    >
      {!!message && !draft && !settings && !receipt && (
        <Text accessibilityLiveRegion="polite">{message}</Text>
      )}
      {p.state === 'loading' ? (
        <LoadingState />
      ) : p.state === 'error' ? (
        <ErrorState onRetry={p.reload} />
      ) : !property ? (
        <EmptyState title="No properties available" />
      ) : (
        <>
          <PropertyPicker
            items={p.items}
            value={id}
            onChange={(next) => {
              p.setSelected(next);
              setReceipt(null);
              setMessage('');
            }}
            disabled={busy}
          />
          {owner && (
            <Button
              title="Rent settings"
              variant="secondary"
              onPress={() => {
                setMessage('');
                setRent('');
                setDay('');
                setSettings(true);
              }}
            />
          )}
          <MonthPicker month={month} latest={monthNow()} onChange={setMonth} disabled={busy} />
          {result.id === id && result.month === month && result.status === 'error' ? (
            <ErrorState onRetry={reload} />
          ) : !data ? (
            <LoadingState />
          ) : (
            <>
              <Highlight
                label="Outstanding rent"
                value={money(data.summary.outstandingPaise)}
                detail={money(data.summary.overduePaise) + ' overdue'}
                metrics={[
                  ['Billed', money(data.summary.billedPaise)],
                  ['Collected against dues', money(data.summary.collectedPaise)],
                ]}
              />
              <Choices
                label="Resident accounts"
                options={[
                  ['DUE', 'With dues'],
                  ['PAID', 'Paid'],
                  ['ALL', 'All'],
                ]}
                value={filter}
                onChange={setFilter}
              />
              {rows.map((x) => (
                <Card key={x.id}>
                  <Text style={{ fontWeight: '700', fontSize: 17 }}>{x.resident.name}</Text>
                  <StatusPill status={x.status} />
                  <Text>{money(x.outstandingPaise)} outstanding</Text>
                  {x.outstandingPaise > 0 && (
                    <Button
                      title="Record payment"
                      disabled={busy}
                      onPress={() => {
                        setMessage('');
                        setDraft({
                          id: x.id,
                          name: x.resident.name,
                          balance: x.outstandingPaise,
                          amount: String(x.outstandingPaise / 100),
                          method: 'CASH',
                        });
                      }}
                    />
                  )}
                </Card>
              ))}
              {!rows.length && (
                <EmptyState
                  title={data.items.length ? 'No accounts match this filter' : 'No dues for this month'}
                  actionLabel={data.items.length ? 'Show all accounts' : undefined}
                  onAction={data.items.length ? () => setFilter('ALL') : undefined}
                />
              )}
            </>
          )}
        </>
      )}
      {settings && owner && (
        <TaskSheet
          title="Rent settings"
          context={property?.name}
          busy={busy}
          message={message}
          onClose={() => {
            setSettings(false);
            setMessage('');
          }}
        >
          <Section>Future dues</Section>
          <Text>Set the monthly rent and due day used when creating new dues.</Text>
          <TextField
            label="Monthly rent (₹)"
            value={rent}
            onChangeText={setRent}
            keyboardType="decimal-pad"
            editable={!busy}
          />
          <TextField
            label="Day of the month"
            placeholder="1 to 28"
            value={day}
            onChangeText={setDay}
            keyboardType="number-pad"
            editable={!busy}
          />
          <Button title="Save rent settings" disabled={busy} onPress={save} />
          <Section>{monthLabel(monthNow())}</Section>
          <Button title="Generate missing dues" variant="secondary" disabled={busy} onPress={generate} />
        </TaskSheet>
      )}
      {draft && (
        <TaskSheet
          title="Record payment"
          context={property?.name}
          busy={busy}
          message={message}
          onClose={closeDraft}
        >
          <Card>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{draft.name}</Text>
            <Text>Outstanding · {money(draft.balance)}</Text>
          </Card>
          <TextField
            label="Amount received (₹)"
            value={draft.amount}
            keyboardType="decimal-pad"
            editable={!busy && !draft.payload}
            onChangeText={(amount) => setDraft((x) => ({ ...x, amount }))}
          />
          <Choices
            label="Payment method"
            options={['CASH', 'BANK_TRANSFER']}
            value={draft.method}
            disabled={busy || !!draft.payload}
            onChange={(method) => setDraft((x) => ({ ...x, method }))}
          />
          <Button
            title={draft.payload ? 'Retry same payment' : 'Confirm payment received'}
            loading={busy}
            onPress={record}
          />
        </TaskSheet>
      )}
      {receipt && (
        <TaskSheet
          title="Payment recorded"
          context={property?.name}
          busy={busy}
          message={message}
          onClose={() => {
            setReceipt(null);
            setMessage('');
          }}
        >
          <Highlight
            label="Amount received"
            value={money(receipt.amountPaise)}
            detail={receipt.rentDue.resident.name}
          />
          <Text selectable>Receipt {receipt.receiptNumber}</Text>
          <Button
            title="Share receipt"
            disabled={busy}
            onPress={() => run(() => shareReceipt(base + '/payments/' + receipt.id + '/receipt'))}
          />
        </TaskSheet>
      )}
    </Screen>
  );
}
