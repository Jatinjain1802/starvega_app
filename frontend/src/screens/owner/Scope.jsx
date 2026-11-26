import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { currentMonth } from './portfolio';

const OwnerScope = createContext(null);

export function OwnerScopeProvider({ children }) {
  const [propertyId, setPropertyId] = useState(null);
  const [month, setMonth] = useState(currentMonth);
  const value = useMemo(() => ({ propertyId, setPropertyId, month, setMonth }), [propertyId, month]);
  return <OwnerScope.Provider value={value}>{children}</OwnerScope.Provider>;
}

export function useOwnerScope() {
  return useContext(OwnerScope);
}

export function useReportingMonth(initialMonth) {
  const scope = useOwnerScope();
  const [local, setLocal] = useState(() => initialMonth || currentMonth());
  const setMonth = scope?.setMonth || setLocal;
  useEffect(() => {
    if (initialMonth) setMonth(initialMonth);
  }, [initialMonth, setMonth]);
  return [scope?.month ?? local, setMonth];
}
