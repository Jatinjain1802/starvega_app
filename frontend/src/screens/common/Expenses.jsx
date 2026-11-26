import { useReportingMonth } from '../owner/Scope';
import TaskSheet from '../../components/TaskSheet';
import RecordLink from '../../components/RecordLink';
import { savePdfReceipt } from '../../services/saveReceipt';
import { PropertyPicker, Choices, MonthPicker, displayName } from '../../components/Controls';
import React, { useEffect, useState } from 'react';
import { Text, Image } from 'react-native';
import { useSelector } from 'react-redux';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, types, isErrorWithCode, errorCodes, keepLocalCopy } from '@react-native-documents/picker';
import { Buffer } from 'buffer';
import {
  Screen,
  Card,
  Button,
  TextField,
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
} from '../../components';
import useProperties from '../../hooks/useProperties';
import { api } from '../../api/client';
const categories = [
  'GROCERY',
  'MAINTENANCE',
  'ELECTRICITY',
  'WATER',
  'SALARY',
  'RENT',
  'INTERNET',
  'CLEANING',
  'OTHER',
];
const money = (n) => '₹' + (n / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const monthNow = () => new Date(Date.now() + 19800000).toISOString().slice(0, 7);
const item = () => ({ name: '', unit: 'pcs', quantity: '1', price: '' });
const blank = () => ({
  category: 'GROCERY',
  description: '',
  vendor: '',
  paymentMethod: 'CASH',
  items: [item()],
  receipts: [],
  requestKey: uuid(),
});
const scaled = (s, d) =>
  new RegExp('^\\d{1,7}(\\.\\d{1,' + d + '})?$').test(s) ? Math.round(Number(s) * 10 ** d) : NaN;
const calculate = (items) =>
  items.map((x) => ({
    name: x.name.trim(),
    unit: x.unit.trim(),
    quantityMilli: scaled(x.quantity, 3),
    unitPricePaise: scaled(x.price, 2),
  }));
const total = (x) => Math.round((x.quantityMilli * x.unitPricePaise) / 1000);
export default function Expenses({ route, navigation }) {
  const manager = useSelector((s) => s.auth.user.role) === 'MANAGER',
    p = useProperties(route.params?.propertyId),
    id = p.selected,
    base = '/properties/' + id + '/expenses';
  const [month, setMonth] = useReportingMonth(route.params?.month),
    [category, setCategory] = useState('ALL'),
    [data, setData] = useState(null),
    [state, setState] = useState('loading'),
    [rev, setRev] = useState(0),
    [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [preview, setPreview] = useState(null);
  const [detail, setDetail] = useState(null);
  const linkedId = route.params?.expenseId;
  useEffect(() => {
    if (!linkedId || id !== route.params?.propertyId) return;
    const controller = new AbortController();
    api
      .get(base + '/' + linkedId, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setDetail({ propertyId: id, expense: data.expense });
        setMonth(new Date(Date.parse(data.expense.incurredAt) + 19800000).toISOString().slice(0, 7));
        navigation.setParams({ expenseId: undefined });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMessage('Unable to open the linked expense.');
          navigation.setParams({ expenseId: undefined });
        }
      });
    return () => controller.abort();
  }, [base, id, linkedId, navigation, route.params?.propertyId]);
  const reload = () => setRev((n) => n + 1);
  useEffect(() => {
    if (!id) return;
    const c = new AbortController();
    setData(null);
    setState('loading');
    (async () => {
      let cursor = null,
        items = [];
      do {
        const { data } = await api.get(base, {
          params: { ...(cursor ? { cursor } : {}), ...(category === 'ALL' ? {} : { category }) },
          signal: c.signal,
        });
        items.push(...data.items);
        cursor = data.nextCursor;
      } while (cursor && !c.signal.aborted);
      const { data: summary } = await api.get(base + '/summary', {
        params: { month },
        signal: c.signal,
      });
      if (!c.signal.aborted) {
        setData({
          id,
          month,
          category,
          summary,
          items: items
            .filter(
              (x) =>
                new Date(new Date(x.incurredAt).getTime() + 19800000).toISOString().slice(0, 7) === month
            )
            .sort((a, b) => new Date(b.incurredAt) - new Date(a.incurredAt)),
        });
        setState('ready');
      }
    })().catch(() => {
      if (!c.signal.aborted) setState('error');
    });
    return () => c.abort();
  }, [id, month, category, rev]);
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  function updateItem(i, key, value) {
    setForm((f) => ({ ...f, items: f.items.map((x, j) => (i === j ? { ...x, [key]: value } : x)) }));
  }
  async function attach(source) {
    if (busy || !form || form.receipts.length >= 3) return;
    setBusy(true);
    setMessage('');
    try {
      let files;
      if (source === 'pdf') {
        const selected = await pick({ type: [types.pdf], allowMultiSelection: false });
        const copies = await keepLocalCopy({
          destination: 'cachesDirectory',
          files: selected.map((f) => ({ uri: f.uri, fileName: f.name || 'receipt.pdf' })),
        });
        files = selected.map((f, i) => {
          if (copies[i]?.status !== 'success') throw Error('Unable to copy PDF');
          return { uri: copies[i].localUri, name: f.name || 'receipt.pdf', type: f.type, size: f.size };
        });
      } else {
        const result = await (source === 'camera' ? launchCamera : launchImageLibrary)({
          mediaType: 'photo',
          quality: 0.75,
          selectionLimit: 1,
        });
        if (result.didCancel) return;
        if (result.errorCode) throw Error(result.errorCode);
        files = (result.assets || []).map((f) => ({
          uri: f.uri,
          name: f.fileName || 'receipt.jpg',
          type: f.type,
          size: f.fileSize,
        }));
      }
      if (
        files.some(
          (f) =>
            !f.uri ||
            !['image/jpeg', 'image/png', 'application/pdf'].includes(f.type) ||
            !Number.isFinite(f.size) ||
            f.size < 1 ||
            f.size > 3145728
        )
      )
        throw Error('Select a JPEG, PNG or PDF up to 3 MB.');
      setForm((f) => ({ ...f, receipts: [...f.receipts, ...files].slice(0, 3) }));
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED))
        setMessage('Unable to attach receipt. Select JPEG, PNG or PDF up to 3 MB.');
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (busy || !manager || !form || !id) return;
    const items = calculate(form.items),
      sum = items.reduce((n, x) => n + total(x), 0);
    if (
      !form.description.trim() ||
      !form.receipts.length ||
      items.some(
        (x) =>
          !x.name ||
          !x.unit ||
          !Number.isInteger(x.quantityMilli) ||
          x.quantityMilli < 1 ||
          x.quantityMilli > 1000000 ||
          !Number.isInteger(x.unitPricePaise) ||
          x.unitPricePaise < 1 ||
          x.unitPricePaise > 100000000 ||
          total(x) < 1
      ) ||
      !Number.isFinite(sum) ||
      sum > 100000000
    ) {
      setMessage('Enter valid item details and attach at least one receipt.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const body = new FormData();
      body.append(
        'expense',
        JSON.stringify({
          category: form.category,
          description: form.description,
          vendor: form.vendor.trim() || null,
          paymentMethod: form.paymentMethod,
          incurredAt: form.incurredAt || new Date().toISOString(),
          requestKey: form.requestKey,
          items,
        })
      );
      form.receipts.forEach((f) =>
        body.append('receipts', { uri: f.uri, name: f.name || 'receipt', type: f.type })
      );
      await api.post(base, body, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
      setForm(null);
      setMonth(monthNow());
      setCategory('ALL');
      setMessage('Expense saved.');
      reload();
    } catch (e) {
      setMessage(
        e.response?.data?.error === 'DUPLICATE_REQUEST'
          ? 'This request already exists. Close the form and refresh to verify the expense.'
          : 'Unable to save expense. Retry the same form or refresh to verify before creating another.'
      );
    } finally {
      setBusy(false);
    }
  }
  async function viewReceipt(expense, receipt) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { data } = await api.get(base + '/' + expense.id + '/receipts/' + receipt.id, {
        responseType: 'arraybuffer',
      });
      const bytes = Buffer.from(data).toString('base64');
      if (receipt.contentType === 'application/pdf') {
        await savePdfReceipt(bytes);
        setMessage('PDF saved.');
      } else setPreview('data:' + receipt.contentType + ';base64,' + bytes);
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED))
        setMessage('Could not open the receipt. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  const expense = detail?.propertyId === id ? detail.expense : null;
  const d = data?.id === id && data.month === month && data.category === category ? data : null;
  return (
    <Screen
      title="Expenses and receipts"
      subtitle={manager ? 'Submit and review expenses' : 'Monthly spending and receipts'}
      refreshing={p.state === 'loading' || (!!id && state === 'loading')}
      onRefresh={() => {
        p.reload();
        reload();
        setPreview(null);
      }}
    >
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
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
            disabled={busy || !!form}
            onChange={(nextId) => {
              p.setSelected(nextId);
              setPreview(null);
              setDetail(null);
              setMessage('');
            }}
          />
          {manager && !form ? (
            <Button
              title="Add expense"
              disabled={busy}
              onPress={() => setForm({ ...blank(), incurredAt: new Date().toISOString() })}
            />
          ) : null}
          {manager && form ? (
            <Card>
              <Text>New expense · {new Date(form.incurredAt).toLocaleString()}</Text>
              <Choices
                label="Category"
                options={categories}
                value={form.category}
                disabled={busy}
                onChange={(v) => change('category', v)}
              />
              <TextField
                label="Description"
                value={form.description}
                maxLength={500}
                editable={!busy}
                onChangeText={(v) => change('description', v)}
              />
              <TextField
                label="Vendor (optional)"
                value={form.vendor}
                maxLength={120}
                editable={!busy}
                onChangeText={(v) => change('vendor', v)}
              />
              <Choices
                label="Payment method"
                options={['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER']}
                value={form.paymentMethod}
                disabled={busy}
                onChange={(v) => change('paymentMethod', v)}
              />
              {form.items.map((x, i) => (
                <Card key={i}>
                  <Text>Item {i + 1}</Text>
                  {[
                    ['name', 'Item name', 120],
                    ['unit', 'Unit', 30],
                    ['quantity', 'Quantity', 12],
                    ['price', 'Unit price (₹)', 12],
                  ].map(([k, label, maxLength]) => (
                    <TextField
                      key={k}
                      label={label}
                      value={x[k]}
                      maxLength={maxLength}
                      keyboardType={['quantity', 'price'].includes(k) ? 'decimal-pad' : 'default'}
                      editable={!busy}
                      onChangeText={(v) => updateItem(i, k, v)}
                    />
                  ))}
                  <Text>Line total: {money(total(calculate([x])[0]) || 0)}</Text>
                  {form.items.length > 1 ? (
                    <Button
                      title="Remove item"
                      variant="secondary"
                      disabled={busy}
                      onPress={() =>
                        change(
                          'items',
                          form.items.filter((_, j) => i !== j)
                        )
                      }
                    />
                  ) : null}
                </Card>
              ))}
              <Button
                title="Add item"
                variant="secondary"
                disabled={busy || form.items.length >= 100}
                onPress={() => change('items', [...form.items, item()])}
              />
              <StatCard
                label="Estimated total"
                value={money(calculate(form.items).reduce((n, x) => n + (total(x) || 0), 0))}
              />
              <Text>Receipts · {form.receipts.length} of 3 attached</Text>
              <Text>Attach at least one photo or PDF, up to 3 MB each.</Text>
              {form.receipts.map((f, i) => (
                <Card key={i}>
                  <Text>{f.name}</Text>
                  <Button
                    title="Remove receipt"
                    variant="secondary"
                    disabled={busy}
                    onPress={() =>
                      change(
                        'receipts',
                        form.receipts.filter((_, j) => i !== j)
                      )
                    }
                  />
                </Card>
              ))}
              {['camera', 'gallery', 'pdf'].map((x) => (
                <Button
                  key={x}
                  title={{ camera: 'Take a photo', gallery: 'Choose a photo', pdf: 'Choose a PDF' }[x]}
                  variant="secondary"
                  disabled={busy || form.receipts.length >= 3}
                  onPress={() => attach(x)}
                />
              ))}
              <Button
                title="Submit expense"
                loading={busy}
                disabled={!form.receipts.length}
                onPress={submit}
              />
              <Button title="Cancel" variant="secondary" disabled={busy} onPress={() => setForm(null)} />
            </Card>
          ) : null}
          {!form && (
            <Card>
              <MonthPicker month={month} latest={monthNow()} onChange={setMonth} disabled={busy} />
              <Choices
                compact
                label="Expense category"
                options={['ALL', ...categories]}
                value={category}
                onChange={setCategory}
                disabled={busy}
              />
            </Card>
          )}

          {state === 'error' ? (
            <ErrorState onRetry={reload} />
          ) : !d ? (
            <LoadingState />
          ) : (
            <>
              <StatCard label="Monthly expenses (all categories)" value={money(d.summary.totalPaise)} />
              {d.summary.categories.map((x) => (
                <Text key={x.category}>
                  {displayName(x.category)}: {money(x.totalPaise)}
                </Text>
              ))}
              {!d.items.length ? (
                <EmptyState title="No matching expenses" />
              ) : (
                d.items.map((e) => (
                  <RecordLink
                    key={e.id}
                    icon="receipt"
                    title={e.description}
                    detail={
                      money(e.totalPaise) +
                      ' · ' +
                      displayName(e.category) +
                      ' · ' +
                      new Date(e.incurredAt).toLocaleDateString('en-IN')
                    }
                    disabled={busy}
                    onPress={() => {
                      setDetail({ propertyId: id, expense: e });
                      setPreview(null);
                      setMessage('');
                    }}
                  />
                ))
              )}
            </>
          )}
        </>
      )}
      {expense && (
        <TaskSheet
          title={preview ? 'Receipt image' : expense.description}
          context={p.items.find((x) => x.id === id)?.name}
          busy={busy}
          message={message}
          onClose={() => {
            if (preview) setPreview(null);
            else setDetail(null);
            setMessage('');
          }}
        >
          {preview ? (
            <Image
              accessibilityLabel="Expense receipt"
              source={{ uri: preview }}
              style={{ width: '100%', height: 480 }}
              resizeMode="contain"
            />
          ) : (
            <>
              <StatCard
                label="Expense total"
                value={money(expense.totalPaise)}
                detail={displayName(expense.category) + ' · ' + displayName(expense.paymentMethod)}
              />
              <Card>
                <Text>Submitted by {expense.author.name}</Text>
                <Text>{new Date(expense.incurredAt).toLocaleString()}</Text>
                {!!expense.vendor && <Text>Vendor · {expense.vendor}</Text>}
              </Card>
              <Card>
                <Text style={{ fontWeight: '700' }}>Items</Text>
                {expense.items.map((x) => (
                  <Text key={x.id}>
                    {x.name} · {x.quantityMilli / 1000} {x.unit} × {money(x.unitPricePaise)} ={' '}
                    {money(x.totalPaise)}
                  </Text>
                ))}
              </Card>
              <Text style={{ fontWeight: '700' }}>Receipts</Text>
              {expense.receipts.map((r, i) => (
                <Button
                  key={r.id}
                  title={
                    (r.contentType === 'application/pdf' ? 'Save PDF receipt ' : 'View receipt ') +
                    (i + 1)
                  }
                  variant="secondary"
                  disabled={busy}
                  onPress={() => viewReceipt(expense, r)}
                />
              ))}
              {!expense.receipts.length && <Text>No attached receipts.</Text>}
            </>
          )}
        </TaskSheet>
      )}
    </Screen>
  );
}
