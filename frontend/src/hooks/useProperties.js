import { useOwnerScope } from '../screens/owner/Scope';
import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';

export default function useProperties(preferredId) {
  const scope = useOwnerScope();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState('loading');
  const [revision, setRevision] = useState(0);
  const lastPreference = useRef();
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    async function load() {
      let cursor = null;
      const rows = [];
      do {
        const { data } = await api.get('/properties', {
          params: cursor ? { cursor } : {},
          signal: controller.signal,
        });
        rows.push(...data.items);
        cursor = data.nextCursor;
      } while (cursor && !controller.signal.aborted);
      if (controller.signal.aborted) return;
      const newPreference = preferredId !== lastPreference.current;
      lastPreference.current = preferredId;
      setItems(rows);
      setSelected((old) => {
        if (newPreference && rows.some((p) => p.id === preferredId)) return preferredId;
        return rows.some((p) => p.id === old) ? old : (rows[0]?.id ?? null);
      });
      setState('ready');
    }
    load().catch(() => {
      if (!controller.signal.aborted) setState('error');
    });
    return () => controller.abort();
  }, [preferredId, revision]);
  const property = items.some((p) => p.id === scope?.propertyId) ? scope.propertyId : selected;
  function chooseProperty(id) {
    setSelected(id);
    scope?.setPropertyId(id);
  }
  return {
    items,
    selected: property,
    setSelected: chooseProperty,
    state,
    reload: () => setRevision((n) => n + 1),
  };
}
