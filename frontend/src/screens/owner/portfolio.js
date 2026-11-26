import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../api/client';
import { colors as base } from '../../theme';

export const colors = {
  ...base, deep: '#103F38', accent: '#D5F19D', soft: '#E6F2EC',
  primary: '#116556', text: '#182F2A', muted: '#50675F', border: '#D9E3DA'
};

export function currentMonth() {
  return new Date(Date.now() + 19800000).toISOString().slice(0, 7);
}
export function money(paise) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
export function percent(value) {
  return value == null ? '—' : value + '%';
}

export function useOwnerPortfolio(month) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ status: 'loading' });
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setResult({ month, status: 'loading' });
    api.get('/owner/finance', { params: { month }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ month, status: 'ready', data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ month, status: 'error' });
      });
    return () => controller.abort();
  }, [month, revision]));
  return {
    ...(result.month === month ? result : { status: 'loading' }),
    reload: () => setRevision(n => n + 1)
  };
}
