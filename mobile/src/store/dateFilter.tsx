import React, { createContext, useCallback, useMemo, useState } from 'react';

export type DateFilter = {
  year: number | null;
  month: number | null; // 1-12
  day: number | null;   // 1-31
};

type DateFilterCtx = DateFilter & {
  setYear: (y: number | null) => void;
  setMonth: (m: number | null) => void;
  setDay: (d: number | null) => void;
  clearFilter: () => void;
  matchesFilter: (dateISO: string) => boolean;
  hasActiveFilter: boolean;
  filterLabel: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

export const DateFilterContext = createContext<DateFilterCtx>({
  year: null,
  month: null,
  day: null,
  setYear: () => {},
  setMonth: () => {},
  setDay: () => {},
  clearFilter: () => {},
  matchesFilter: () => true,
  hasActiveFilter: false,
  filterLabel: 'All Time',
  isOpen: false,
  setIsOpen: () => {},
});

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [year, _setYear] = useState<number | null>(null);
  const [month, _setMonth] = useState<number | null>(null);
  const [day, _setDay] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const setYear = useCallback((y: number | null) => {
    _setYear(y);
    _setMonth(null); // cascade clear
    _setDay(null);
  }, []);

  const setMonth = useCallback((m: number | null) => {
    _setMonth(m);
    _setDay(null); // cascade clear
  }, []);

  const setDay = useCallback((d: number | null) => {
    _setDay(d);
  }, []);

  const clearFilter = useCallback(() => {
    _setYear(null);
    _setMonth(null);
    _setDay(null);
  }, []);

  const matchesFilter = useCallback(
    (dateISO: string): boolean => {
      if (!year) return true; // no filter → everything passes

      const d = new Date(dateISO);
      if (isNaN(d.getTime())) return false;

      if (d.getFullYear() !== year) return false;
      if (month !== null && d.getMonth() + 1 !== month) return false;
      if (day !== null && d.getDate() !== day) return false;

      return true;
    },
    [year, month, day],
  );

  const hasActiveFilter = year !== null;

  const filterLabel = useMemo(() => {
    if (!year) return 'All Time';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (month === null) return `${year}`;
    if (day === null) return `${monthNames[month - 1]} ${year}`;
    return `${monthNames[month - 1]} ${day}, ${year}`;
  }, [year, month, day]);

  const value = useMemo(
    () => ({ year, month, day, setYear, setMonth, setDay, clearFilter, matchesFilter, hasActiveFilter, filterLabel, isOpen, setIsOpen }),
    [year, month, day, setYear, setMonth, setDay, clearFilter, matchesFilter, hasActiveFilter, filterLabel, isOpen],
  );

  return <DateFilterContext.Provider value={value}>{children}</DateFilterContext.Provider>;
}
